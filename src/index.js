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

const CARD_COLORS = ['#5ce1e6', '#ffde59', '#ff66c4', '#a6ff96', '#c9a6ff'];

app.get('/', (c) => {
  const origin = new URL(c.req.url).origin;

  const grouped = endpointsList.reduce((acc, item) => {
    const cat = item.category || 'Lainnya';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const categoriesHtml = Object.entries(grouped).map(([cat, items], catIndex) => {
    const cardsHtml = items.map((item, i) => {
      const curlCommand = item.curlCmd
        ? item.curlCmd(origin)
        : `curl -X GET "${origin}${item.path}"`;

      const testingUi = item.testUi
        || `<button class="btn" onclick="testApi('${item.path}')">🧪 Test GET</button>`;

      const color = CARD_COLORS[i % CARD_COLORS.length];

      return `
        <div class="card api-card" style="background:${color}; animation-delay:${i * 60}ms;">
          <h3>${item.name}</h3>
          <p class="path"><span>Path</span><code>${item.path}</code></p>
          <p class="desc">${item.desc}</p>
          <div class="action-box">${testingUi}</div>
          <details class="curl-box">
            <summary>cURL Command</summary>
            <div class="code-box">${curlCommand}</div>
          </details>
        </div>
      `;
    }).join('');

    return `
      <section class="category" style="animation-delay:${catIndex * 90}ms;">
        <button class="cat-header" onclick="toggleCategory(this)">
          <span>${cat}</span>
          <span class="cat-meta">${items.length} endpoint <i class="chevron">▾</i></span>
        </button>
        <div class="cat-body open">
          <div class="cat-body-inner">${cardsHtml}</div>
        </div>
      </section>
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
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          background: #f3f3e0;
          color: #000;
          margin: 0;
          padding: 16px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 14px;
        }
        .container { max-width: 620px; margin: 0 auto; }

        @keyframes popIn {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .hero {
          background: #ffde59;
          border: 3px solid #000;
          border-radius: 20px;
          box-shadow: 6px 6px 0px #000;
          padding: 18px 20px;
          margin-bottom: 18px;
          animation: popIn 0.4s ease both;
        }
        h1 { font-size: 1.6rem; text-transform: uppercase; margin: 0 0 4px; letter-spacing: -0.5px; }
        .hero p { margin: 0; font-size: 0.85rem; }

        .category {
          margin-bottom: 14px;
          animation: popIn 0.4s ease both;
        }
        .cat-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #000;
          color: #fff;
          border: none;
          border-radius: 16px;
          padding: 12px 18px;
          font-family: inherit;
          font-weight: bold;
          font-size: 0.95rem;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.15s ease, border-radius 0.25s ease;
        }
        .cat-header:hover { transform: translateY(-2px); }
        .cat-header:active { transform: translateY(0px) scale(0.98); }
        .cat-meta { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: normal; opacity: 0.8; }
        .chevron { display: inline-block; transition: transform 0.3s ease; }
        .cat-header.closed .chevron { transform: rotate(-90deg); }
        .cat-header.closed { border-radius: 16px; }

        .cat-body {
          display: grid;
          grid-template-rows: 1fr;
          transition: grid-template-rows 0.35s ease;
        }
        .cat-body.closed { grid-template-rows: 0fr; }
        .cat-body-inner { overflow: hidden; }
        .cat-body.open .cat-body-inner { padding-top: 12px; }

        .card {
          border: 3px solid #000;
          border-radius: 18px;
          box-shadow: 5px 5px 0px #000;
          padding: 16px;
          margin-bottom: 12px;
          animation: popIn 0.4s ease both;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card:hover { transform: translateY(-3px); box-shadow: 7px 7px 0px #000; }
        .card:last-child { margin-bottom: 0; }
        h3 { margin: 0 0 8px; font-size: 1.05rem; }

        .path { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: 0.8rem; }
        .path span { opacity: 0.6; }
        .desc { margin: 0 0 12px; font-size: 0.82rem; line-height: 1.4; }

        button, input {
          font-family: inherit;
        }
        .btn, button.btn {
          background: #ff5757;
          color: #fff;
          font-weight: bold;
          font-size: 0.82rem;
          border: 3px solid #000;
          border-radius: 12px;
          padding: 8px 14px;
          cursor: pointer;
          box-shadow: 3px 3px 0px #000;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 4px 4px 0px #000; }
        .btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0px #000; }

        input[type="text"] {
          border-radius: 10px;
          border: 3px solid #000;
          padding: 8px 10px;
          font-size: 0.82rem;
        }

        .action-box { margin-bottom: 10px; }

        details.curl-box summary {
          cursor: pointer;
          font-size: 0.78rem;
          font-weight: bold;
          opacity: 0.75;
          list-style: none;
          user-select: none;
        }
        details.curl-box summary::-webkit-details-marker { display: none; }
        details.curl-box summary::before { content: '▸ '; }
        details.curl-box[open] summary::before { content: '▾ '; }
        .code-box {
          background: #fff;
          border: 2px solid #000;
          border-radius: 10px;
          padding: 8px 10px;
          margin-top: 6px;
          font-size: 0.75rem;
          word-break: break-all;
        }
        code {
          background: #fff;
          border: 2px solid #000;
          border-radius: 6px;
          padding: 1px 5px;
          font-weight: bold;
          font-size: 0.75rem;
        }

        .output-card {
          background: #ff66c4;
          border: 3px solid #000;
          border-radius: 20px;
          box-shadow: 6px 6px 0px #000;
          padding: 16px 18px;
          animation: popIn 0.4s ease both;
        }
        .output-card h3 { margin-bottom: 10px; }
        pre#output {
          background: #000;
          color: #0f0;
          padding: 12px;
          border-radius: 12px;
          border: 2px solid #000;
          overflow-x: auto;
          max-height: 260px;
          white-space: pre-wrap;
          word-wrap: break-word;
          margin: 0;
          font-size: 0.75rem;
          transition: opacity 0.2s ease;
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="hero">
          <h1>PontaLabs Api 🚀</h1>
          <p>Total endpoint aktif: <b>${endpointsList.length}</b> — dikelompokkan per kategori biar rapi.</p>
        </div>

        ${categoriesHtml}

        <div class="output-card">
          <h3>📺 Response Output</h3>
          <pre id="output">// Hasil response tes bakal muncul di sini...</pre>
        </div>
      </div>

      <script>
        function toggleCategory(headerEl) {
          const body = headerEl.nextElementSibling;
          const willClose = body.classList.contains('open');
          body.classList.toggle('open', !willClose);
          body.classList.toggle('closed', willClose);
          headerEl.classList.toggle('closed', willClose);
        }

        async function testApi(path) {
          const out = document.getElementById('output');
          out.style.opacity = '0.4';
          out.textContent = 'Loading...';
          try {
            const res = await fetch(path);
            const data = await res.json();
            out.textContent = JSON.stringify(data, null, 2);
          } catch (err) {
            out.textContent = 'Error: ' + err.message;
          } finally {
            out.style.opacity = '1';
          }
        }
      </script>
    </body>
    </html>
  `;
  return c.html(html);
});

export default app;
