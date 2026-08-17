import { extractVideoId, downloadFromSavetube, VIDEO_QUALITIES } from '../ytdl-core.js';

export const config = {
  path: '/api/ytmp4',
  name: 'YouTube to MP4 🎬',
  category: 'Downloader',
  desc: 'Download video MP4 dari YouTube',

  curlCmd: (origin) => `curl -X POST "${origin}/api/ytmp4" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://youtube.com/watch?v=VIDEO_ID","quality":720}'`,

  testUi: `
    <div class="input-row">
      <input type="text" id="ytmp4-url" placeholder="Link video YouTube...">
    </div>
    <div class="input-row" style="margin-top:8px;">
      <select id="ytmp4-quality">
        <option value="144">144p</option>
        <option value="360" selected>360p</option>
        <option value="480">480p</option>
        <option value="720">720p</option>
        <option value="1080">1080p</option>
      </select>
      <button class="btn sound-click" onclick="testYtmp4(this)">🧪 Test</button>
    </div>
    <script>
      function testYtmp4(btn) {
        const card = btn.closest('.card');
        const url = card.querySelector('#ytmp4-url').value;
        const quality = card.querySelector('#ytmp4-quality').value;
        if (!url) return;
        testApi('/api/ytmp4', '__RESPONSE_ID__', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, quality: Number(quality) })
        });
      }
    </script>
  `
};

export const handle = async (c) => {
  let url, quality;

  try {
    const body = await c.req.json();
    url = body?.url;
    quality = body?.quality;
  } catch {
    return c.json({ status: false, message: 'Body harus JSON valid, contoh: {"url":"...","quality":720}' }, 400);
  }

  if (!url) {
    return c.json({ status: false, message: 'Parameter "url" wajib diisi ya!' }, 400);
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return c.json({ status: false, message: 'Link YouTube gak valid!' }, 400);
  }

  const finalQuality = VIDEO_QUALITIES.includes(Number(quality)) ? Number(quality) : 360;

  try {
    const download = await downloadFromSavetube(`https://youtube.com/watch?v=${videoId}`, finalQuality, 'video');
    return c.json({ status: true, videoId, download });
  } catch (error) {
    return c.json({ status: false, message: error.message || 'Gagal memproses download' }, 500);
  }
};
