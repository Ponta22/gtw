import { extractVideoId, downloadFromSavetube, AUDIO_QUALITIES } from '../ytdl-core.js';

export const config = {
  path: '/api/ytmp3',
  name: 'YouTube to MP3 🎵',
  category: 'Downloader',
  desc: 'Download audio MP3 dari video YouTube (92/128/256/320 kbps)',

  curlCmd: (origin) => `curl -X POST "${origin}/api/ytmp3" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://youtube.com/watch?v=VIDEO_ID","quality":128}'`,

  testUi: `
    <div class="input-row">
      <input type="text" id="ytmp3-url" placeholder="Link video YouTube...">
    </div>
    <div class="input-row" style="margin-top:8px;">
      <select id="ytmp3-quality">
        <option value="92">92 kbps</option>
        <option value="128" selected>128 kbps</option>
        <option value="256">256 kbps</option>
        <option value="320">320 kbps</option>
      </select>
      <button class="btn sound-click" onclick="testYtmp3(this)">🧪 Test</button>
    </div>
    <script>
      function testYtmp3(btn) {
        const card = btn.closest('.card');
        const url = card.querySelector('#ytmp3-url').value;
        const quality = card.querySelector('#ytmp3-quality').value;
        if (!url) return;
        testApi('/api/ytmp3', '__RESPONSE_ID__', {
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
    return c.json({ status: false, message: 'Body harus JSON valid, contoh: {"url":"...","quality":128}' }, 400);
  }

  if (!url) {
    return c.json({ status: false, message: 'Parameter "url" wajib diisi ya!' }, 400);
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return c.json({ status: false, message: 'Link YouTube gak valid!' }, 400);
  }

  const finalQuality = AUDIO_QUALITIES.includes(Number(quality)) ? Number(quality) : 128;

  try {
    const download = await downloadFromSavetube(`https://youtube.com/watch?v=${videoId}`, finalQuality, 'audio');
    return c.json({ status: true, videoId, download });
  } catch (error) {
    return c.json({ status: false, message: error.message || 'Gagal memproses download' }, 500);
  }
};
