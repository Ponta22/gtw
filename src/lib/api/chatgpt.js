export const config = {
  path: '/api/chatgpt',
  name: 'ChatGPT API 🤖',
  desc: 'Endpoint buat ngobrol sama ChatGPT (support chatId, auth, & websearch)',
  
  // Custom cURL command khusus ChatGPT
  curlCmd: (origin) => `curl -X GET "${origin}/api/chatgpt?prompt=Halo&websearch=true"`,
  
  // Custom UI buat Form Testing Interaktif ChatGPT
  testUi: `
    <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
      <input type="text" id="chatgpt-input" placeholder="Ketik prompt di sini..." style="flex: 1; padding: 8px; border: 3px solid #000; font-weight: bold;">
      <button onclick="testChatGpt()">🧪 Test Chat</button>
    </div>
    <script>
      async function testChatGpt() {
        const input = document.getElementById('chatgpt-input').value || 'Halo';
        const url = '/api/chatgpt?prompt=' + encodeURIComponent(input);
        testApi(url);
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
