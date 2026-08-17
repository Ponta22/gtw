import * as cheerio from 'cheerio';

export const config = {
  path: '/api/kraken',
  name: 'Kraken Downloader 📦',
  category: 'Downloader',
  desc: 'Ambil link download dari Krakenfiles',

  curlCmd: (origin) => `curl -X GET "${origin}/api/kraken?url=https://krakenfiles.com/view/xxxxx/file.html"`,

  testUi: `
    <div class="input-row">
      <input type="text" id="kraken-input" placeholder="Tempel link Krakenfiles di sini...">
      <button class="btn sound-click" onclick="testKraken(this)">🧪 Test</button>
    </div>
    <script>
      function testKraken(btn) {
        const card = btn.closest('.card');
        const input = card.querySelector('#kraken-input').value;
        if (!input) return;
        const url = '/api/kraken?url=' + encodeURIComponent(input);
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
    const targetUrl = 'https://cors.codeteam.dpdns.org/?url=' + encodeURIComponent(url);
    const html = await fetch(targetUrl).then((r) => r.text());

    const $ = cheerio.load(html);

    const title = $('title').text().replace(' - Krakenfiles.com', '').trim();
    const thumbnail = $('meta[property="og:image"]').attr('content') || null;
    const direct = $('video source').attr('src') || null;

    if (!direct) {
      return c.json({ status: 'error', message: 'Tidak dapat menemukan URL unduhan langsung. Mungkin file tidak tersedia atau link rusak.' }, 404);
    }

    return c.json({
      status: 'success',
      title: title || 'Krakenfile',
      thumbnail,
      direct
    });
  } catch (error) {
    return c.json({ status: 'error', message: 'Gagal memproses link Krakenfiles', error: error.message }, 500);
  }
};
