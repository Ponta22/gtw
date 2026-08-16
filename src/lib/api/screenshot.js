export const config = {
  path: '/api/screenshot',
  name: 'Website Screenshot 📸',
  category: 'Tools',
  desc: 'Screenshot halaman website',

  curlCmd: (origin) => `curl -X POST "${origin}/api/screenshot" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com"}'`,

  testUi: `
    <div class="input-row">
      <input type="text" id="ss-url" placeholder="https://example.com">
      <button class="btn sound-click" onclick="testScreenshot(this)">🧪 Test</button>
    </div>
    <script>
      function testScreenshot(btn) {
        const card = btn.closest('.card');
        const url = card.querySelector('#ss-url').value;
        if (!url) return;
        testApi('/api/screenshot', '__RESPONSE_ID__', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
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

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  try {
    const shotUrl = `https://image.thum.io/get/width/1280/crop/900/${url}`;
    const shotRes = await fetch(shotUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });

    if (!shotRes.ok) {
      return c.json({ status: false, message: `Gagal ambil screenshot dari target (HTTP ${shotRes.status})` }, 502);
    }

    const buffer = await shotRes.arrayBuffer();
    const contentType = shotRes.headers.get('content-type') || 'image/jpeg';
    const blob = new Blob([buffer], { type: contentType });

    const formData = new FormData();
    formData.append('files[]', blob, `screenshot-${Date.now()}.jpg`);

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

    return c.json({ status: true, target: url, screenshot: imageUrl });
  } catch (error) {
    return c.json({ status: false, message: error.message || 'Gagal memproses screenshot' }, 500);
  }
};
