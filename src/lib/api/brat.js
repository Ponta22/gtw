import { Resvg, initWasm } from '@resvg/resvg-wasm';
import wasmModule from '@resvg/resvg-wasm/index_bg.wasm';
import jpeg from 'jpeg-js';

const CANVAS_SIZE = 500;
const PADDING = 24;
const LINE_HEIGHT_RATIO = 1.02;
const CHAR_WIDTH_RATIO = 0.58;
const LETTER_SPACING = -2;
const CONTRAST = 1.5;

let wasmReady = false;

async function ensureWasm() {
  if (!wasmReady) {
    await initWasm(wasmModule);
    wasmReady = true;
  }
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function estimateCharWidth(fontSize) {
  return Math.max(1, fontSize * CHAR_WIDTH_RATIO + LETTER_SPACING);
}

function wrapLines(text, fontSize, maxWidth) {
  const charWidth = estimateCharWidth(fontSize);
  const maxCharsPerLine = Math.max(1, Math.floor(maxWidth / charWidth));
  const paragraphs = text.split('\n');
  const lines = [];

  for (const para of paragraphs) {
    if (para === '') {
      lines.push('');
      continue;
    }

    const words = para.split(' ');
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxCharsPerLine || current === '') {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }

    if (current) lines.push(current);
  }

  return lines;
}

function fitText(text, maxWidth, maxHeight) {
  let fontSize = 300;

  while (fontSize > 8) {
    const lines = wrapLines(text, fontSize, maxWidth);
    const charWidth = estimateCharWidth(fontSize);
    const widestLine = Math.max(...lines.map((l) => l.length * charWidth), 0);
    const totalHeight = lines.length * fontSize * LINE_HEIGHT_RATIO;

    if (widestLine <= maxWidth && totalHeight <= maxHeight) {
      return { fontSize, lines };
    }

    fontSize -= 2;
  }

  return { fontSize: 8, lines: wrapLines(text, 8, maxWidth) };
}

function buildSvg(text) {
  const maxWidth = CANVAS_SIZE - PADDING * 2;
  const maxHeight = CANVAS_SIZE - PADDING * 2;
  const { fontSize, lines } = fitText(text, maxWidth, maxHeight);

  const textElements = lines.map((line, i) => {
    const y = PADDING + fontSize * LINE_HEIGHT_RATIO * (i + 1) - fontSize * 0.2;
    return `<text x="${PADDING}" y="${y}" font-size="${fontSize}" xml:space="preserve">${escapeXml(line)}</text>`;
  }).join('');

  return `<svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="#ffffff"/>
    <defs>
      <filter id="bratFilter" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.8"/>
      </filter>
    </defs>
    <g filter="url(#bratFilter)" font-family="Arial, Helvetica, sans-serif" font-weight="400" letter-spacing="${LETTER_SPACING}" fill="#000000">
      ${textElements}
    </g>
  </svg>`;
}

function applyContrast(pixels) {
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = clamp((pixels[i] - 128) * CONTRAST + 128);
    pixels[i + 1] = clamp((pixels[i + 1] - 128) * CONTRAST + 128);
    pixels[i + 2] = clamp((pixels[i + 2] - 128) * CONTRAST + 128);
  }
  return pixels;
}

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

export const config = {
  path: '/api/brat',
  name: 'Brat Text Generator 🍏',
  category: 'Generator',
  desc: 'Generate Image Brat',

  curlCmd: (origin) => `curl -X POST "${origin}/api/brat" \\
  -H "Content-Type: application/json" \\
  -d '{"text":"brat"}'`,

  testUi: `
    <div class="input-row">
      <input type="text" id="brat-input" placeholder="Ketik teks kamu..." value="brat">
      <button class="btn sound-click" onclick="testBrat(this)">🧪 Test</button>
    </div>
    <script>
      function testBrat(btn) {
        const card = btn.closest('.card');
        const text = card.querySelector('#brat-input').value || 'brat';
        testApi('/api/brat', '__RESPONSE_ID__', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
      }
    </script>
  `
};

export const handle = async (c) => {
  let text;

  try {
    const body = await c.req.json();
    text = body?.text;
  } catch {
    return c.json({ status: false, message: 'Body harus JSON valid, contoh: {"text":"..."}' }, 400);
  }

  if (!text || !String(text).trim()) {
    text = 'brat';
  }

  try {
    await ensureWasm();

    const svg = buildSvg(String(text));
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: CANVAS_SIZE } });
    const rendered = resvg.render();

    const pixels = applyContrast(rendered.pixels);
    const jpegData = jpeg.encode({ data: pixels, width: rendered.width, height: rendered.height }, 92);

    const blob = new Blob([jpegData.data], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('files[]', blob, `brat-${Date.now()}.jpg`);

    const uploadRes = await fetch('https://uguu.se/upload', {
      method: 'POST',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      body: formData
    });

    const rawText = await uploadRes.text();

    if (!uploadRes.ok) {
      return c.json({ status: false, message: `Gagal upload ke Uguu (HTTP ${uploadRes.status})`, detail: rawText.slice(0, 300) }, 502);
    }

    let uploadResult;
    try {
      uploadResult = JSON.parse(rawText);
    } catch {
      return c.json({ status: false, message: 'Respons Uguu bukan JSON valid', detail: rawText.slice(0, 300) }, 502);
    }

    const imageUrl = uploadResult?.files?.[0]?.url;

    if (!imageUrl) {
      return c.json({ status: false, message: 'Upload berhasil tapi URL gambar gak ketemu', detail: uploadResult }, 500);
    }

    return c.json({ status: true, text, image: imageUrl });
  } catch (error) {
    return c.json({ status: false, message: error.message || 'Gagal generate gambar' }, 500);
  }
};
