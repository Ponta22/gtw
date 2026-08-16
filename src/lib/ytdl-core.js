import { createDecipheriv } from 'node:crypto';
import { Buffer } from 'node:buffer';

export const AUDIO_QUALITIES = [92, 128, 256, 320];
export const VIDEO_QUALITIES = [144, 360, 480, 720, 1080];

const SECRET_KEY = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36';

export function extractVideoId(url) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|v\/|embed\/|user\/[^\/\n\s]+\/)?(?:watch\?v=|v%3D|embed%2F|video%2F)?|youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/playlist\?list=)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function decryptData(encryptedData) {
  const encryptedBuffer = Buffer.from(encryptedData, 'base64');
  const iv = encryptedBuffer.subarray(0, 16);
  const content = encryptedBuffer.subarray(16);
  const key = Buffer.from(SECRET_KEY, 'hex');

  const decipher = createDecipheriv('aes-128-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);

  return JSON.parse(decrypted.toString());
}

export async function downloadFromSavetube(link, quality, downloadType) {
  const cdnRes = await fetch('https://media.savetube.vip/api/random-cdn');
  if (!cdnRes.ok) throw new Error('Gagal ambil CDN Savetube');
  const { cdn } = await cdnRes.json();

  const infoRes = await fetch(`https://${cdn}/v2/info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Referer': 'https://save-tube.com/'
    },
    body: JSON.stringify({ url: link })
  });
  if (!infoRes.ok) throw new Error('Gagal ambil info video');
  const infoJson = await infoRes.json();
  const info = decryptData(infoJson.data);

  const downloadRes = await fetch(`https://${cdn}/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Referer': 'https://save-tube.com/'
    },
    body: JSON.stringify({ downloadType, quality: String(quality), key: info.key })
  });
  if (!downloadRes.ok) throw new Error('Gagal ambil link download');
  const data = await downloadRes.json();

  const qualityStr = `${quality}${downloadType === 'audio' ? 'kbps' : 'p'}`;
  const extension = downloadType === 'audio' ? '.mp3' : '.mp4';
  const filename = `${info.title} (${qualityStr})${extension}`;

  return {
    title: info.title,
    quality: qualityStr,
    downloadUrl: data.data.downloadUrl,
    filename
  };
}
