import { Hono } from 'hono';
import * as chatgpt from './lib/api/chatgpt.js';

const app = new Hono();

// Daftar semua module endpoint (tambahin manual tiap ada file baru di lib/api/)
const apiFiles = [chatgpt];
const endpointsList = [];

apiFiles.forEach((module) => {
  if (module.config && module.handle) {
    app.get(module.config.path, module.handle);
    app.post(module.config.path, module.handle);

    endpointsList.push(module.config);
  }
});

// UI Neo-Brutalisme (Universal)
app.get('/', (c) => {
  const origin = new URL(c.req.url).origin;

  const cardsHtml = endpointsList.map((item) => {
    const curlCommand = item.curlCmd 
      ? item.curlCmd(origin) 
      : `curl -X GET "${origin}${item.path}"`;

    const testingUi = item.testUi 
      || `<button onclick="testApi('${item.path}')">🧪 Test GET</button>`;

    return `
      <div class="card api-card">
        <h2>${item.name}</h2>
        <p><b>Path:</b> <code>${item.path}</code></p>
        <p>${item.desc}</p>

        <div class="action-box">
          ${testingUi}
        </div>

        <p><b>cURL Command:</b></p>
        <div class="code-box">${curlCommand}</div>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PontaLabs Api</title>
      <style>
        * { box-sizing: border-box; font-family: 'Courier New', Courier, monospace; }
        body { background-color: #f3f3e0; color: #000; padding: 20px; margin: 0; }
        .container { max-width: 800px; margin: 0 auto; }
        
        .card {
          background: #ffde59;
          border: 4px solid #000;
          box-shadow: 8px 8px 0px #000;
          padding: 24px;
          margin-bottom: 24px;
        }
        .api-card { background: #5ce1e6; }
        h1 { font-size: 2.5rem; text-transform: uppercase; margin-top: 0; }
        h2 { margin-top: 0; border-bottom: 3px solid #000; padding-bottom: 5px; }
        
        button {
          background: #ff5757;
          color: #fff;
          font-weight: bold;
          border: 3px solid #000;
          padding: 8px 16px;
          cursor: pointer;
          box-shadow: 4px 4px 0px #000;
        }
        button:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0px #000; }
        
        pre {
          background: #000;
          color: #0f0;
          padding: 15px;
          border: 3px solid #000;
          overflow-x: auto;
          max-height: 300px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .code-box { background: #fff; border: 3px solid #000; padding: 8px; font-size: 0.85rem; word-break: break-all; }
        code { background: #fff; border: 2px solid #000; padding: 2px 6px; font-weight: bold; }
        .action-box { margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <h1>PontaLabs Api 🚀</h1>
          <p>Total Endpoint Aktif: <b>${endpointsList.length}</b></p>
        </div>

        ${cardsHtml}

        <div class="card" style="background: #ff66c4;">
          <h2>📺 Response Output</h2>
          <pre id="output">// Hasil response tes bakal muncul di sini...</pre>
        </div>
      </div>

      <script>
        async function testApi(path) {
          document.getElementById('output').textContent = 'Loading...';
          try {
            const res = await fetch(path);
            const data = await res.json();
            document.getElementById('output').textContent = JSON.stringify(data, null, 2);
          } catch (err) {
            document.getElementById('output').textContent = 'Error: ' + err.message;
          }
        }
      </script>
    </body>
    </html>
  `;
  return c.html(html);
});

export default app;
