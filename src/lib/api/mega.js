import { createDecipheriv } from 'node:crypto';
import { Buffer } from 'node:buffer';

const MEGA_API = 'https://g.api.mega.co.nz/cs';

export const config = {
  path: '/api/mega',
  name: 'Mega Downloader ☁️',
  category: 'Downloader',
  desc: 'Ambil metadata & direct link file dari Mega.nz',

  curlCmd: (origin) => `curl -X GET "${origin}/api/mega?url=https://mega.nz/file/xxxx#yyyy"`,

  testUi: `
    <div class="input-row">
      <input type="text" id="mega-input" placeholder="Tempel link Mega.nz di sini...">
      <button class="btn sound-click" onclick="testMega(this)">🧪 Test</button>
    </div>
    <script>
      function testMega(btn) {
        const card = btn.closest('.card');
        const input = card.querySelector('#mega-input').value;
        if (!input) return;
        const url = '/api/mega?url=' + encodeURIComponent(input);
        testApi(url, '__RESPONSE_ID__');
      }
    </script>
  `
};

export const handle = async (c) => {
  const url = c.req.query('url');

  if (!url) {
    return c.json({ status: 'error', message: 'Parameter "url" wajib diisi ya!' }, 400);
  }

  try {
    const { fileId, fileKey } = parseMegaUrl(url);
    const info = await getMegaInfo(fileId);
    const direct = await getMegaDirect(fileId);

    const size = info?.s != null ? formatSize(info.s) : 'Tidak diketahui';
    let fileName = `mega_${fileId}`;

    if (fileKey && info?.at) {
      try {
        const decoded = decodeAttr(info.at, fileKey);
        if (decoded) fileName = decoded;
      } catch {}
    }

    return c.json({
      status: 'success',
      fileId,
      fileName,
      size,
      direct
    });
  } catch (error) {
    return c.json({ status: 'error', message: error.message || 'Gagal memproses link Mega' }, 500);
  }
};

async function getMegaDirect(fileId) {
  const url = `${MEGA_API}?id=${Date.now()}&n=${fileId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify([{ a: 'g', g: 1, ssl: 1, p: fileId }])
  });

  if (!res.ok) throw new Error('Gagal memanggil API MEGA');

  const data = await res.json();
  const direct = data?.[0]?.g;

  if (!direct) throw new Error('Direct link tidak tersedia');

  return direct;
}

async function getMegaInfo(fileId) {
  const res = await fetch(`${MEGA_API}?id=${Date.now()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ a: 'g', g: 1, ssl: 2, p: fileId }])
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const info = Array.isArray(data) ? data[0] : data;

  if (typeof info === 'number' && info < 0) {
    const errMap = { '-9': 'File tidak ditemukan / expired', '-3': 'Too many requests' };
    throw new Error(errMap[String(info)] ?? `Mega error: ${info}`);
  }

  return info;
}

function parseMegaUrl(url) {
  url = String(url).trim();

  const match =
    url.match(/mega\.(?:nz|co\.nz)\/file\/([A-Za-z0-9_-]{8})#([A-Za-z0-9_-]+)/) ||
    url.match(/mega\.(?:nz|co\.nz)\/#!([A-Za-z0-9_-]{8})!([A-Za-z0-9_-]+)/);

  if (!match) throw new Error('Link Mega tidak valid!');

  return { fileId: match[1], fileKey: match[2] };
}

function b64ToA32(str) {
  const buf = Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const arr = [];
  for (let i = 0; i < buf.length; i += 4) {
    arr.push(((buf[i] || 0) << 24) | ((buf[i + 1] || 0) << 16) | ((buf[i + 2] || 0) << 8) | (buf[i + 3] || 0));
  }
  return arr;
}

function a32ToBuffer(a32) {
  const buf = Buffer.alloc(a32.length * 4);
  for (let i = 0; i < a32.length; i++) buf.writeUInt32BE(a32[i] >>> 0, i * 4);
  return buf;
}

function decodeAttr(attrStr, keyB64) {
  const key = b64ToA32(keyB64);
  const k = [
    (key[0] ^ key[4]) >>> 0,
    (key[1] ^ key[5]) >>> 0,
    (key[2] ^ key[6]) >>> 0,
    (key[3] ^ key[7]) >>> 0
  ];

  const aesKey = a32ToBuffer(k);
  const attrBuf = Buffer.from(attrStr.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

  const iv = Buffer.alloc(16, 0);
  const decipher = createDecipheriv('aes-128-cbc', aesKey, iv);
  decipher.setAutoPadding(false);

  const decrypted = Buffer.concat([decipher.update(attrBuf), decipher.final()])
    .toString('utf8')
    .replace(/\0+$/g, '');

  if (!decrypted.startsWith('MEGA')) return null;
  const json = JSON.parse(decrypted.slice(4));
  return json?.n ?? null;
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return 'Tidak diketahui';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(2)} ${units[i]}`;
}
