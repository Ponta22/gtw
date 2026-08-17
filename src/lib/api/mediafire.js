import * as cheerio from 'cheerio';

export const config = {
  path: '/api/mediafire',
  name: 'MediaFire Downloader 📦',
  category: 'Downloader',
  desc: 'Ambil link download MediaFire',

  curlCmd: (origin) => `curl -X GET "${origin}/api/mediafire?url=${encodeURIComponent('https://www.mediafire.com/file/xxxxx/sample.zip/file')}"`,

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
        const url = '/api/mediafire?url=' + encodeURIComponent(input);
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

  if (!url.match(/mediafire\.com/i)) {
    return c.json({ status: 'error', message: 'Link harus dari MediaFire!' }, 400);
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    const downloadBtn = $('#downloadButton');
    if (!downloadBtn.length) {
      return c.json({ status: 'error', message: 'Gagal mengambil link download. File mungkin udah dihapus atau limit.' }, 404);
    }

    let direct = downloadBtn.attr('href') || downloadBtn.attr('data-href');
    const scrambled = downloadBtn.attr('data-scrambled-url');

    if (scrambled) {
      direct = Buffer.from(scrambled, 'base64').toString('utf-8');
    }

    const filename = direct ? decodeURIComponent(direct.split('/').pop().replace(/\+/g, ' ')) : 'MediaFire File';
    const title = $('div.filename').text().trim() || filename;

    return c.json({
      status: 'success',
      title,
      filename,
      direct
    });
  } catch (error) {
    return c.json({ status: 'error', message: 'Gagal memproses link MediaFire', error: error.message }, 500);
  }
};
