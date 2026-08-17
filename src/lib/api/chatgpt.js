export const config = {
  path: '/api/chatgpt',
  name: 'ChatGPT API 🤖',
  category: 'AI Chat',
  desc: 'Endpoint buat ngobrol sama ChatGPT',
  
  // Custom cURL command khusus ChatGPT
  curlCmd: (origin) => `curl -X GET "${origin}/api/chatgpt?prompt=Halo&websearch=true"`,
  
  // Custom UI buat Form Testing Interaktif ChatGPT
  testUi: `
    <div class="input-row">
      <input type="text" id="chatgpt-input" placeholder="Ketik prompt di sini...">
      <button class="btn" onclick="testChatGpt(this)">🧪 Test</button>
    </div>
    <script>
      function testChatGpt(btn) {
        const card = btn.closest('.card');
        const input = card.querySelector('#chatgpt-input').value || 'Halo';
        const url = '/api/chatgpt?prompt=' + encodeURIComponent(input);
        testApi(url, '__RESPONSE_ID__');
      }
    </script>
  `
};

export const handle = async (c) => {
  const prompt = c.req.query('prompt');
  const chatId = c.req.query('chatId');
  const auth = c.req.query('auth');
  const websearch = c.req.query('websearch');

  if (!prompt) {
    return c.json({ status: 'error', message: 'Parameter "prompt" wajib diisi ya!' }, 400);
  }

  try {
    const targetUrl = new URL('https://chatgpt.codeteam.dpdns.org/chat/v2/chatgpt');
    targetUrl.searchParams.append('prompt', prompt);

    if (chatId) targetUrl.searchParams.append('chatId', chatId);
    if (auth) targetUrl.searchParams.append('auth', auth);
    if (websearch) targetUrl.searchParams.append('websearch', websearch);

    const response = await fetch(targetUrl.toString());
    const data = await response.json();

    return c.json(data, response.status);
  } catch (error) {
    return c.json({ status: 'error', message: 'Gagal terhubung ke server ChatGPT', error: error.message }, 500);
  }
};
