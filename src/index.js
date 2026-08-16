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

const CAT_COLORS = ['#ffe600', '#ff76a5', '#5ce1e6', '#7cfc00', '#b388ff'];
const CARD_COLORS = ['#5ce1e6', '#ffe600', '#ff76a5', '#7cfc00', '#b388ff'];

app.get('/', (c) => {
  const origin = new URL(c.req.url).origin;

  const grouped = endpointsList.reduce((acc, item) => {
    const cat = item.category || 'Lainnya';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const catEntries = Object.entries(grouped);
  let globalIndex = 0;

  const folderGridHtml = catEntries.map(([cat, items], catIndex) => {
    const catColor = CAT_COLORS[catIndex % CAT_COLORS.length];
    const catId = `cat-${catIndex}`;
    const namesForSearch = items.map((i) => i.name.toLowerCase()).join(' ');

    return `
      <button class="folder-card" data-catsearch="${cat.toLowerCase()} ${namesForSearch}" onclick="openCategory('${catId}')">
        <span class="icon-box" style="background:${catColor};">📂</span>
        <div class="folder-info">
          <h3>${cat}</h3>
          <span>${items.length} endpoint</span>
        </div>
        <span class="folder-arrow">→</span>
      </button>
    `;
  }).join('');

  const categoryViewsHtml = catEntries.map(([cat, items], catIndex) => {
    const catColor = CAT_COLORS[catIndex % CAT_COLORS.length];
    const catId = `cat-${catIndex}`;

    const cardsHtml = items.map((item) => {
      const respId = `resp-${globalIndex}`;
      const curlId = `curl-${globalIndex}`;
      const cardColor = CARD_COLORS[globalIndex % CARD_COLORS.length];
      globalIndex++;

      const curlCommand = item.curlCmd
        ? item.curlCmd(origin)
        : `curl -X GET "${origin}${item.path}"`;

      const rawTestingUi = item.testUi
        || `<div class="input-row"><button class="btn sound-click" onclick="testApi('${item.path}', '__RESPONSE_ID__')">🧪 Test GET</button></div>`;

      const testingUi = rawTestingUi.replaceAll('__RESPONSE_ID__', respId);

      return `
        <div class="card" data-name="${item.name.toLowerCase()}" data-desc="${item.desc.toLowerCase()}">
          <button class="card-head sound-click" onclick="toggleCard(this)">
            <div class="card-top">
              <span class="icon-box" style="background:${cardColor};">🔌</span>
              <h3>${item.name}</h3>
              <span class="ping-dot"></span>
            </div>
            <p class="path"><span>Path</span><code>${item.path}</code></p>
            <p class="desc">${item.desc}</p>
            <span class="card-tap-hint"><i class="chevron">▾</i> Tap buat test & lihat cURL</span>
          </button>

          <div class="card-body">
            <div class="card-body-inner">
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
                  <button class="copy-btn sound-click" onclick="copyCurl('${curlId}', this)">📋</button>
                </div>
              </details>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="view category-view" id="${catId}">
        <button class="back-btn sound-click" onclick="showHome()">← Kembali</button>
        <div class="view-header">
          <span class="icon-box" style="background:${catColor};">📂</span>
          <h2>${cat}</h2>
        </div>
        <div class="search-wrap">
          <input type="text" placeholder="🔍 Cari di ${cat}..." oninput="filterCards(this.value, '${catId}')">
        </div>
        <div class="cards-wrap">${cardsHtml}</div>
        <div class="empty-state" style="display:none;">Gak ketemu endpoint yang cocok 🕵️</div>
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
        :root {
          --border-color: #000;
          --border-width: 3px;
          --radius: 18px;
          --speed: 0.3s;
          --ease: cubic-bezier(0.16, 1, 0.3, 1);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background-color: #f4f0ea;
          background-image: radial-gradient(rgba(0,0,0,0.16) 1.5px, transparent 1.5px);
          background-size: 22px 22px;
          color: #000;
          padding: 16px;
          font-size: 14px;
          overflow-x: hidden;
        }
        .container { max-width: 640px; margin: 0 auto; }
        code, .mono { font-family: 'Courier New', Courier, monospace; }

        button, input { -webkit-tap-highlight-color: transparent; user-select: none; font-family: inherit; }
        input { user-select: text; }

        @keyframes popIn {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(28px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }

        .hero {
          background: #ffe600;
          border: var(--border-width) solid var(--border-color);
          border-radius: var(--radius);
          box-shadow: 6px 6px 0px #000;
          padding: 20px 22px;
          margin-bottom: 14px;
          animation: popIn 0.4s var(--ease) both;
        }
        h1 {
          font-size: 1.7rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
        }
        h1 .rocket { display: inline-block; animation: wiggle 1.8s ease-in-out infinite; transform-origin: 70% 70%; }
        .hero p { font-size: 0.85rem; font-weight: 600; opacity: 0.85; }

        .view { display: none; }
        .view.active { display: block; }
        #homeView.active { animation: popIn 0.35s var(--ease) both; }
        .category-view.active { animation: slideInRight 0.35s var(--ease) both; }

        .search-wrap { margin-bottom: 16px; }
        .search-wrap input {
          width: 100%;
          border-radius: 14px;
          border: var(--border-width) solid var(--border-color);
          padding: 12px 16px;
          font-size: 0.88rem;
          font-weight: 800;
          background: #fff;
          box-shadow: 4px 4px 0px #000;
          transition: box-shadow var(--speed) var(--ease), transform var(--speed) var(--ease);
        }
        .search-wrap input:focus {
          outline: none;
          box-shadow: 6px 6px 0px #000;
          transform: translate(-2px, -2px);
        }

        .folder-grid { display: flex; flex-direction: column; gap: 12px; }
        .folder-card {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          background: #fff;
          border: var(--border-width) solid var(--border-color);
          border-radius: var(--radius);
          padding: 14px 16px;
          cursor: pointer;
          box-shadow: 5px 5px 0px #000;
          text-align: left;
          animation: popIn 0.4s var(--ease) both;
          will-change: transform, box-shadow;
          transition: transform var(--speed) var(--ease), box-shadow var(--speed) var(--ease);
        }
        .folder-card:hover { transform: translate(-3px, -3px); box-shadow: 8px 8px 0px #000; }
        .folder-card:active { transform: translate(1px, 1px); box-shadow: 2px 2px 0px #000; }
        .folder-card.hidden { display: none; }
        .folder-info { flex: 1; }
        .folder-info h3 { font-size: 1rem; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
        .folder-info span { font-size: 0.75rem; font-weight: 700; opacity: 0.55; }
        .folder-arrow { font-size: 1.2rem; font-weight: 900; transition: transform var(--speed) var(--ease); }
        .folder-card:hover .folder-arrow { transform: translateX(4px); }

        .back-btn {
          background: #fff;
          border: var(--border-width) solid var(--border-color);
          border-radius: 12px;
          padding: 8px 14px;
          font-weight: 800;
          font-size: 0.8rem;
          cursor: pointer;
          box-shadow: 3px 3px 0px #000;
          margin-bottom: 14px;
          will-change: transform, box-shadow;
          transition: transform var(--speed) var(--ease), box-shadow var(--speed) var(--ease);
        }
        .back-btn:hover { transform: translate(-3px, -3px); box-shadow: 5px 5px 0px #000; }
        .back-btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0px #000; }

        .view-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .view-header h2 { font-size: 1.3rem; font-weight: 900; text-transform: uppercase; }

        .icon-box {
          width: 34px; height: 34px;
          border: var(--border-width) solid var(--border-color);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          flex-shrink: 0;
          transition: transform var(--speed) var(--ease);
        }
        .folder-card:hover .icon-box,
        .card:hover .icon-box { transform: rotate(-8deg) scale(1.08); }

        .cards-wrap { display: flex; flex-direction: column; }

        .card {
          background: #fff;
          border: var(--border-width) solid var(--border-color);
          border-radius: 20px;
          box-shadow: 6px 6px 0px #000;
          padding: 18px;
          margin-bottom: 14px;
          animation: popIn 0.4s var(--ease) both;
          will-change: transform, box-shadow;
          transition: transform var(--speed) var(--ease), box-shadow var(--speed) var(--ease);
        }
        .card:hover { transform: translate(-3px, -3px); box-shadow: 9px 9px 0px #000; }
        .card:last-child { margin-bottom: 0; }
        .card.hidden { display: none; }

        .card-head {
          display: block;
          width: 100%;
          background: none;
          border: none;
          padding: 0;
          text-align: left;
          cursor: pointer;
        }
        .card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        h3 { flex: 1; font-size: 1.05rem; font-weight: 800; }
        .ping-dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: #1fbf4b; border: 2px solid #000;
          animation: pulse 2s ease-in-out infinite;
          flex-shrink: 0;
        }

        .path { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 0.8rem; }
        .path span { opacity: 0.55; font-weight: 700; }
        .desc { margin-bottom: 10px; font-size: 0.85rem; line-height: 1.5; font-weight: 500; opacity: 0.85; }

        .card-tap-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          opacity: 0.5;
        }
        .card-tap-hint .chevron { transition: transform var(--speed) var(--ease); }
        .card-head.open .card-tap-hint .chevron { transform: rotate(180deg); }
        .card-head.open .card-tap-hint { opacity: 0.75; }

        .card-body {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows var(--speed) var(--ease);
        }
        .card-body.open { grid-template-rows: 1fr; }
        .card-body-inner { overflow: hidden; }
        .card-body.open .card-body-inner { padding-top: 14px; }

        .input-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .input-row input[type="text"] {
          flex: 1;
          min-width: 120px;
          border-radius: 12px;
          border: var(--border-width) solid var(--border-color);
          padding: 10px 12px;
          font-size: 0.85rem;
          font-weight: 700;
          box-shadow: 3px 3px 0px #000;
        }
        .input-row input[type="text"]:focus {
          outline: none;
          transform: translate(-2px, -2px);
          box-shadow: 5px 5px 0px #000;
        }

        .btn {
          background: #ff5252;
          color: #fff;
          font-weight: 800;
          font-size: 0.85rem;
          text-transform: uppercase;
          border: var(--border-width) solid var(--border-color);
          border-radius: 12px;
          padding: 10px 16px;
          cursor: pointer;
          box-shadow: 4px 4px 0px #000;
          white-space: nowrap;
          will-change: transform, box-shadow;
          transition: transform var(--speed) var(--ease), box-shadow var(--speed) var(--ease), background var(--speed) var(--ease);
        }
        .btn:hover { transform: translate(-3px, -3px); box-shadow: 7px 7px 0px #000; }
        .btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0px #000; transition-duration: 0.08s; }
        .btn.loading { opacity: 0.65; cursor: wait; }

        .action-box { margin-bottom: 10px; }

        .response-panel {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height var(--speed) var(--ease), opacity var(--speed) var(--ease), margin var(--speed) var(--ease);
        }
        .response-panel.show { max-height: 320px; opacity: 1; margin-bottom: 12px; }
        .response-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .response-label { font-size: 0.72rem; font-weight: 800; opacity: 0.6; text-transform: uppercase; }
        .status-badge {
          font-size: 0.7rem;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 8px;
          border: 2px solid #000;
          background: #fff;
        }
        .status-badge.ok { background: #7cfc00; }
        .status-badge.err { background: #ff9b9b; }
        .status-badge.pending { background: #ffe600; }

        .response-panel pre {
          background: #000;
          color: #7cfc00;
          padding: 12px;
          border-radius: 14px;
          border: 2px solid #000;
          overflow: auto;
          max-height: 240px;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.72rem;
        }
        .loading-dots::after { content: ''; animation: dots 1.2s steps(4, end) infinite; }
        @keyframes dots {
          0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; }
        }

        details.curl-box summary {
          cursor: pointer;
          font-size: 0.78rem;
          font-weight: 800;
          opacity: 0.7;
          list-style: none;
          user-select: none;
        }
        details.curl-box summary::-webkit-details-marker { display: none; }
        details.curl-box summary::before { content: '▸ '; }
        details.curl-box[open] summary::before { content: '▾ '; }
        .code-box-row { display: flex; gap: 6px; align-items: stretch; margin-top: 6px; }
        .code-box {
          flex: 1;
          background: #fdfdfd;
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
          font-size: 0.85rem;
          padding: 0 12px;
          box-shadow: 3px 3px 0px #000;
          transition: transform var(--speed) var(--ease), background var(--speed) var(--ease), box-shadow var(--speed) var(--ease);
        }
        .copy-btn:hover { transform: translate(-2px, -2px); box-shadow: 5px 5px 0px #000; }
        .copy-btn.copied { background: #7cfc00; }
        code {
          background: #fdfdfd;
          border: 2px solid #000;
          border-radius: 6px;
          padding: 1px 6px;
          font-weight: 700;
          font-size: 0.75rem;
        }

        .empty-state { text-align: center; padding: 30px 10px; font-size: 0.85rem; font-weight: 700; opacity: 0.5; }

        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="hero">
          <h1><span class="rocket">🚀</span> PontaLabs Api</h1>
          <p>Total endpoint aktif: <b>${endpointsList.length}</b> — pilih kategori buat masuk dan lihat endpoint di dalamnya.</p>
        </div>

        <div class="view active" id="homeView">
          <div class="search-wrap">
            <input type="text" placeholder="🔍 Cari kategori atau endpoint..." oninput="filterHome(this.value)">
          </div>
          <div class="folder-grid" id="folderGrid">${folderGridHtml}</div>
          <div class="empty-state" id="homeEmptyState" style="display:none;">Gak ketemu yang cocok 🕵️</div>
        </div>

        ${categoryViewsHtml}
      </div>

      <script>
        let audioCtx = null;
        function initAudio() {
          if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        function beep(type, startFreq, endFreq, dur, vol) {
          initAudio();
          if (!audioCtx) return;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + dur);
          gain.gain.setValueAtTime(vol, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + dur);
        }
        function playClickSfx() { beep('sine', 800, 400, 0.04, 0.08); }
        function playNavSfx(isOpen) { beep('triangle', isOpen ? 300 : 500, isOpen ? 600 : 250, 0.06, 0.09); }

        document.addEventListener('click', (e) => {
          if (e.target.closest('.sound-click')) playClickSfx();
        });

        function toggleCard(headEl) {
          const body = headEl.nextElementSibling;
          const willOpen = !body.classList.contains('open');
          body.classList.toggle('open', willOpen);
          headEl.classList.toggle('open', willOpen);
          playNavSfx(willOpen);
        }

        function openCategory(catId) {
          document.getElementById('homeView').classList.remove('active');
          document.querySelectorAll('.category-view').forEach((v) => v.classList.remove('active'));
          document.getElementById(catId).classList.add('active');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          playNavSfx(true);
        }

        function showHome() {
          document.querySelectorAll('.category-view').forEach((v) => v.classList.remove('active'));
          document.getElementById('homeView').classList.add('active');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          playNavSfx(false);
        }

        function filterHome(query) {
          const q = query.trim().toLowerCase();
          const folders = document.querySelectorAll('.folder-card');
          let visibleCount = 0;

          folders.forEach((f) => {
            const match = !q || f.dataset.catsearch.includes(q);
            f.classList.toggle('hidden', !match);
            if (match) visibleCount++;
          });

          document.getElementById('homeEmptyState').style.display = visibleCount === 0 && q ? 'block' : 'none';
        }

        function filterCards(query, catId) {
          const view = document.getElementById(catId);
          const q = query.trim().toLowerCase();
          const cards = view.querySelectorAll('.card');
          let visibleCount = 0;

          cards.forEach((card) => {
            const match = !q || card.dataset.name.includes(q) || card.dataset.desc.includes(q);
            card.classList.toggle('hidden', !match);
            if (match) visibleCount++;
          });

          view.querySelector('.empty-state').style.display = visibleCount === 0 && q ? 'block' : 'none';
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
