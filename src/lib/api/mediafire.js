import axios from 'axios';
import * as cheerio from 'cheerio';

export const config = {
  path: '/api/mediafire',
  name: 'MediaFire Downloader 📁',
  category: 'Downloader',
  desc: 'Ambil direct link download file dari MediaFire',

  curlCmd: (origin) => `curl -X POST "${origin}/api/mediafire" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://www.mediafire.com/file/xxxxx/nama.ext/file"}'`,

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
        testApi('/api/mediafire', '__RESPONSE_ID__', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: input })
        });
      }
    </script>
  `
};

export const handle = async (c) => {
  let url;

  try {
    const body = await c.req.json();
    url = body?.url;
  } catch {
    return c.json({ status: false, message: 'Body harus JSON valid, contoh: {"url":"..."}' }, 400);
  }

  if (!url) {
    return c.json({ status: false, message: 'Parameter "url" wajib diisi ya!' }, 400);
  }

  if (!/mediafire\.com/i.test(url)) {
    return c.json({ status: false, message: 'Link harus dari MediaFire!' }, 400);
  }

  try {
    const res = await axios.get(url, {
      adapter: 'fetch',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = res.data;
    const $ = cheerio.load(html);

    const downloadBtn = $('#downloadButton');
    if (!downloadBtn.length) {
      return c.json({ status: false, message: 'Tombol download gak ketemu. File mungkin udah dihapus atau link salah.' }, 404);
    }

    const downloadUrl = downloadBtn.attr('href') || null;

    if (!downloadUrl) {
      return c.json({ status: false, message: 'Direct link gak ketemu' }, 404);
    }

    const fileNameEl = $('.dl-btn-label');
    const fileName = fileNameEl.attr('title') || null;

    const btnText = downloadBtn.text().trim();
    const sizeMatch = btnText.match(/\((.*?)\)/);
    const fileSize = sizeMatch ? sizeMatch[1] : null;

    return c.json({ status: true, fileName, fileSize, downloadUrl });
  } catch (error) {
    if (error.response) {
      return c.json({ status: false, message: `Gagal buka halaman MediaFire (HTTP ${error.response.status})` }, 502);
    }
    return c.json({ status: false, message: error.message || 'Gagal memproses link MediaFire' }, 500);
  }
};
