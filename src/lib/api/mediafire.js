import * as cheerio from 'cheerio';
import { Buffer } from 'node:buffer';

export const config = {
  path: '/api/mediafire',
  name: 'MediaFire Downloader 📁',
  category: 'Downloader',
  desc: 'Ambil direct link download file dari MediaFire',

  curlCmd: (origin) => `curl -X GET "${origin}/api/mediafire?url=${encodeURIComponent('https://www.mediafire.com/file/xxxxx/nama.ext/file')}"`,

  testUi: `
    <div class="input-row">
      <input type="text" id="mf-input" placeholder="Tempel link MediaFire di sini...">
      <button class="btn sound-click" onclick="testMediafire(this)">🧪 Test</button>
    </div>
    <script>
      function testMediafire(btn) {
        const card = btn.closest('.card');
        const input = card.querySelector('#mf-input').value;
        if (!input) return;
        testApi('/api/mediafire?url=' + encodeURIComponent(input), '__RESPONSE_ID__');
      }
    </script>
  `
};

export const handle = async (c) => {
  let url = c.req.query('url');

  if (!url) {
    try {
      const body = await c.req.json();
      url = body?.url;
    } catch {}
  }

  if (!url) {
    return c.json({ status: false, message: 'Parameter "url" wajib diisi ya!' }, 400);
  }

  if (!/mediafire\.com/i.test(url)) {
    return c.json({ status: false, message: 'Link harus dari MediaFire!' }, 400);
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });

    if (!res.ok) {
      return c.json({ status: false, message: `Gagal buka halaman MediaFire (HTTP ${res.status})` }, 502);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const downloadBtn = $('#downloadButton');
    if (!downloadBtn.length) {
      return c.json({ status: false, message: 'Tombol download gak ketemu. File mungkin udah dihapus atau link salah.' }, 404);
    }

    let downloadUrl = downloadBtn.attr('href') || downloadBtn.attr('data-href') || null;
    const scrambled = downloadBtn.attr('data-scrambled-url');

    if (scrambled) {
      downloadUrl = Buffer.from(scrambled, 'base64').toString('utf-8');
    }

    if (!downloadUrl) {
      return c.json({ status: false, message: 'Direct link gak ketemu' }, 404);
    }

    const fileName = decodeURIComponent(downloadUrl.split('/').pop().replace(/\+/g, ' '));

    return c.json({ status: true, fileName, downloadUrl });
  } catch (error) {
    return c.json({ status: false, message: error.message || 'Gagal memproses link MediaFire' }, 500);
  }
};
