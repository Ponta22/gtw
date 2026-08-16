import { Hono } from 'hono';
import * as chatgpt from './lib/api/chatgpt.js';

const app = new Hono();

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

  let globalIndex = 0;

  const categoriesHtml = Object.entries(grouped).map(([cat, items], catIndex) => {
    const cardsHtml = items.map((item) => {
      const respId = `resp-${globalIndex}`;
      const curlId = `curl-${globalIndex}`;
      globalIndex++;

      const curlCommand = item.curlCmd
        ? item.curlCmd(origin)
        : `curl -X GET "${origin}${item.path}"`;

      const rawTestingUi = item.testUi
        || `<div class="input-row"><button class="btn" onclick="testApi('${item.path}', '__RESPONSE_ID__')">🧪 Test GET</button></div>`;

      const testingUi = rawTestingUi.replaceAll('__RESPONSE_ID__', respId);
      const color = CARD_COLORS[globalIndex % CARD_COLORS.length];

      return `
        <div class="card api-card" data-name="${item.name.toLowerCase()}" data-desc="${item.desc.toLowerCase()}" style="background:${color};">
          <div class="card-top">
            <h3>${item.name}</h3>
            <span class="ping-dot"></span>
          </div>
          <p class="path"><span>Path</span><code>${item.path}</code></p>
          <p class="desc">${item.desc}</p>
          <div class="action-box">${testingUi}</div>

          <div class="response-panel" id="${respId}">
            <div class="response-head">
              <span class="response-label">Response</span>
              <span class="status-badge" id="${respId}-badge"></span>
            </div>
            <pre id="${respId}-body"></pre>
          </div>

          <details class="curl-box">
            <summary>cURL Command</summary>
            <div class="code-box-row">
              <div class="code-box" id="${curlId}">${curlCommand}</div>
              <button class="copy-btn" onclick="copyCurl('${curlId}', this)">📋</button>
            </div>
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
          background-image:
            radial-gradient(circle at 8% 12%, rgba(92,225,230,0.35), transparent 32%),
            radial-gradient(circle at 92% 18%, rgba(255,102,196,0.3), transparent 30%),
            radial-gradient(circle at 50% 95%, rgba(255,222,89,0.3), transparent 35%);
          background-attachment: fixed;
          color: #000;
          margin: 0;
          padding: 16px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 14px;
        }
        .container { max-width: 640px; margin: 0 auto; }

        @keyframes popIn {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        @keyframes dots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
        }
        @keyframes slideOpen {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 320px; }
        }

        .hero {
          background: #ffde59;
          border: 3px solid #000;
          border-radius: 20px;
          box-shadow: 6px 6px 0px #000;
          padding: 18px 20px;
          margin-bottom: 14px;
          animation: popIn 0.4s ease both;
          position: relative;
          overflow: hidden;
        }
        h1 {
          font-size: 1.6rem;
          text-transform: uppercase;
          margin: 0 0 4px;
          letter-spacing: -0.5px;
          display: inline-block;
        }
        h1 .rocket { display: inline-block; animation: wiggle 1.8s ease-in-out infinite; transform-origin: 70% 70%; }
        .hero p { margin: 0; font-size: 0.85rem; }

        .search-wrap { margin-bottom: 16px; animation: popIn 0.4s ease both; animation-delay: 0.05s; }
        .search-wrap input {
          width: 100%;
          border-radius: 14px;
          border: 3px solid #000;
          padding: 10px 14px;
          font-size: 0.85rem;
          font-weight: bold;
          background: #fff;
          box-shadow: 4px 4px 0px #000;
          transition: box-shadow 0.15s ease, transform 0.15s ease;
        }
        .search-wrap input:focus {
          outline: none;
          box-shadow: 5px 5px 0px #000;
          transform: translateY(-1px);
        }

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
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }
        .card:hover { transform: translateY(-3px); box-shadow: 7px 7px 0px #000; }
        .card:last-child { margin-bottom: 0; }
        .card.hidden { display: none; }

        .card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        h3 { margin: 0; font-size: 1.05rem; }
        .ping-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #1fbf4b; border: 2px solid #000;
          animation: pulse 2s ease-in-out infinite;
          flex-shrink: 0;
        }

        .path { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: 0.8rem; }
        .path span { opacity: 0.6; }
        .desc { margin: 0 0 12px; font-size: 0.82rem; line-height: 1.4; }

        button, input { font-family: inherit; }
        .input-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .input-row input[type="text"] {
          flex: 1;
          min-width: 120px;
          border-radius: 10px;
          border: 3px solid #000;
          padding: 8px 10px;
          font-size: 0.82rem;
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
          white-space: nowrap;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 4px 4px 0px #000; }
        .btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0px #000; }
        .btn.loading { opacity: 0.7; cursor: wait; }

        .action-box { margin-bottom: 10px; }

        .response-panel {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.35s ease, opacity 0.3s ease, margin 0.35s ease;
        }
        .response-panel.show {
          max-height: 320px;
          opacity: 1;
          margin-bottom: 12px;
          animation: slideOpen 0.35s ease;
        }
        .response-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .response-label { font-size: 0.75rem; font-weight: bold; opacity: 0.7; text-transform: uppercase; }
        .status-badge {
          font-size: 0.7rem;
          font-weight: bold;
          padding: 2px 8px;
          border-radius: 8px;
          border: 2px solid #000;
          background: #fff;
        }
        .status-badge.ok { background: #a6ff96; }
        .status-badge.err { background: #ff9b9b; }
        .status-badge.pending { background: #fff59e; }

        .response-panel pre {
          background: #000;
          color: #0f0;
          padding: 10px 12px;
          border-radius: 12px;
          border: 2px solid #000;
          overflow-x: auto;
          overflow-y: auto;
          max-height: 240px;
          white-space: pre-wrap;
          word-wrap: break-word;
          margin: 0;
          font-size: 0.72rem;
        }
        .loading-dots::after {
          content: '';
          animation: dots 1.2s steps(4, end) infinite;
        }

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
        .code-box-row { display: flex; gap: 6px; align-items: stretch; margin-top: 6px; }
        .code-box {
          flex: 1;
          background: #fff;
          border: 2px solid #000;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 0.75rem;
          word-break: break-all;
        }
        .copy-btn {
          border: 2px solid #000;
          border-radius: 10px;
          background: #fff;
          cursor: pointer;
          font-size: 0.8rem;
          padding: 0 10px;
          transition: transform 0.12s ease, background 0.15s ease;
        }
        .copy-btn:hover { transform: translateY(-2px); }
        .copy-btn.copied { background: #a6ff96; }
        code {
          background: #fff;
          border: 2px solid #000;
          border-radius: 6px;
          padding: 1px 5px;
          font-weight: bold;
          font-size: 0.75rem;
        }

        .empty-state {
          text-align: center;
          padding: 30px 10px;
          font-size: 0.85rem;
          opacity: 0.6;
          animation: popIn 0.3s ease both;
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="hero">
          <h1><span class="rocket">🚀</span> PontaLabs Api</h1>
          <p>Total endpoint aktif: <b>${endpointsList.length}</b> — dikelompokkan per kategori, tinggal klik test buat lihat hasilnya langsung di kartunya.</p>
        </div>

        <div class="search-wrap">
          <input type="text" id="searchBox" placeholder="🔍 Cari endpoint..." oninput="filterCards(this.value)">
        </div>

        <div id="categoryWrap">${categoriesHtml}</div>
        <div class="empty-state" id="emptyState" style="display:none;">Gak ketemu endpoint yang cocok 🕵️</div>
      </div>

      <script>
        function toggleCategory(headerEl) {
          const body = headerEl.nextElementSibling;
          const willClose = body.classList.contains('open');
          body.classList.toggle('open', !willClose);
          body.classList.toggle('closed', willClose);
          headerEl.classList.toggle('closed', willClose);
        }

        function filterCards(query) {
          const q = query.trim().toLowerCase();
          const cards = document.querySelectorAll('.card');
          let visibleCount = 0;

          cards.forEach((card) => {
            const match = !q || card.dataset.name.includes(q) || card.dataset.desc.includes(q);
            card.classList.toggle('hidden', !match);
            if (match) visibleCount++;
          });

          document.querySelectorAll('.category').forEach((section) => {
            const visible = section.querySelectorAll('.card:not(.hidden)').length;
            section.style.display = visible === 0 && q ? 'none' : '';
          });

          document.getElementById('emptyState').style.display = visibleCount === 0 && q ? 'block' : 'none';
        }

        async function testApi(path, respId) {
          const panel = document.getElementById(respId);
          const body = document.getElementById(respId + '-body');
          const badge = document.getElementById(respId + '-badge');
          const btn = event.currentTarget;

          panel.classList.add('show');
          badge.textContent = 'loading';
          badge.className = 'status-badge pending';
          body.innerHTML = '<span class="loading-dots">Fetching</span>';
          if (btn) btn.classList.add('loading');

          try {
            const res = await fetch(path);
            const data = await res.json();
            badge.textContent = res.status;
            badge.className = 'status-badge ' + (res.ok ? 'ok' : 'err');
            body.textContent = JSON.stringify(data, null, 2);
          } catch (err) {
            badge.textContent = 'error';
            badge.className = 'status-badge err';
            body.textContent = 'Error: ' + err.message;
          } finally {
            if (btn) btn.classList.remove('loading');
          }
        }

        function copyCurl(curlId, btn) {
          const text = document.getElementById(curlId).textContent;
          navigator.clipboard.writeText(text).then(() => {
            btn.classList.add('copied');
            const original = btn.textContent;
            btn.textContent = '✅';
            setTimeout(() => {
              btn.classList.remove('copied');
              btn.textContent = original;
            }, 1200);
          });
        }
      </script>
    </body>
    </html>
  `;
  return c.html(html);
});

export default app;
