/**
 * MAIN World Network Interceptor
 * Injected at document_start with world: "MAIN"
 * 
 * Patches window.fetch to intercept AI platform API responses,
 * extract chat data, and dispatch it to the ISOLATED content script.
 */

(function patchFetch() {
  const originalFetch = window.fetch;
  let authToken = null;
  let hasStartedSync = false;

  window.fetch = async function (...args) {
    // 1. Capture the Authorization token for background syncing
    try {
      if (args[1] && args[1].headers) {
        const headers = new Headers(args[1].headers);
        if (headers.has('Authorization')) authToken = headers.get('Authorization');
      } else if (args[0] && typeof args[0] === 'object' && args[0].headers) {
        const headers = new Headers(args[0].headers);
        if (headers.has('Authorization')) authToken = headers.get('Authorization');
      }
    } catch (e) { }

    const response = await originalFetch.apply(this, args);

    try {
      let url = '';
      if (typeof args[0] === 'string') {
        url = args[0];
      } else if (args[0] && typeof args[0] === 'object' && typeof args[0].url === 'string') {
        url = args[0].url;
      }

      if (!url) return response;

      // ── ChatGPT: conversation list (MUST be checked BEFORE singular) ───────
      if (url.includes('chatgpt.com/backend-api/conversations')) {
        const cloned = response.clone();
        cloned.json().then(data => {
          if (data?.items) {
            data.items.forEach(item => {
              dispatchChatEvent({
                id: `chatgpt_${item.id}`,
                platform: 'chatgpt',
                title: item.title || 'Untitled',
                url: `https://chatgpt.com/c/${item.id}`,
                messages: null,
                createdAt: item.create_time ? new Date(item.create_time * 1000) : new Date(),
                updatedAt: item.update_time ? new Date(item.update_time * 1000) : new Date(),
              });
            });

            // Trigger silent background sync to fetch all old chats
            if (!hasStartedSync && authToken) {
              hasStartedSync = true;
              autoSyncChatGPT(authToken);
            }
          }
        }).catch(() => { });
      }

      // ── ChatGPT: SSE conversation stream (Singular) ──────────────────────
      else if (url.includes('chatgpt.com/backend-api/conversation') && !url.includes('gen_title')) {
        const cloned = response.clone();
        handleChatGPTStream(cloned, url).catch(console.error);
      }

      // ── Claude: conversation list ─────────────────────────────────────────
      if (url.includes('claude.ai/api/organizations') && url.includes('conversations') && !url.includes('/messages')) {
        const cloned = response.clone();
        cloned.json().then(data => {
          const convos = Array.isArray(data) ? data : data?.conversations || [];
          convos.forEach(convo => {
            dispatchChatEvent({
              id: `claude_${convo.uuid}`,
              platform: 'claude',
              title: convo.name || 'Untitled',
              url: `https://claude.ai/chat/${convo.uuid}`,
              messages: null,
              createdAt: convo.created_at ? new Date(convo.created_at) : new Date(),
              updatedAt: convo.updated_at ? new Date(convo.updated_at) : new Date(),
            });
          });
        }).catch(() => { });
      }

      // ── Claude: single conversation with messages ─────────────────────────
      else if (url.includes('claude.ai/api/organizations') && url.includes('/conversations/') && !url.includes('/messages')) {
        const cloned = response.clone();
        cloned.json().then(data => {
          if (data?.uuid) {
            const messages = (data.chat_messages || []).map(m => ({
              role: m.sender === 'human' ? 'user' : 'assistant',
              content: extractClaudeContent(m.content),
              timestamp: m.created_at,
            }));
            dispatchChatEvent({
              id: `claude_${data.uuid}`,
              platform: 'claude',
              title: data.name || 'Untitled',
              url: `https://claude.ai/chat/${data.uuid}`,
              messages,
              createdAt: data.created_at ? new Date(data.created_at) : new Date(),
              updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
            });
          }
        }).catch(() => { });
      }

    } catch (e) {
      // Never break the page's own fetch
    }

    return response;
  };

  // ── Background Auto-Syncer (Fetches ALL historical chats) ─────────────────
  async function autoSyncChatGPT(token) {
    console.log('[AI Toolbox] Starting silent background sync for older chats...');
    let offset = 28; // ChatGPT natively loads the first 28 on load
    let hasMore = true;
    let totalSynced = 0;

    // Loop through history 100 chats at a time (Capped at 3000 to be safe)
    while (hasMore && offset < 3000) {
      try {
        const res = await originalFetch(`https://chatgpt.com/backend-api/conversations?offset=${offset}&limit=100`, {
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) break;
        const data = await res.json();

        if (data && data.items && data.items.length > 0) {
          data.items.forEach(item => {
            dispatchChatEvent({
              id: `chatgpt_${item.id}`,
              platform: 'chatgpt',
              title: item.title || 'Untitled',
              url: `https://chatgpt.com/c/${item.id}`,
              messages: null,
              createdAt: item.create_time ? new Date(item.create_time * 1000) : new Date(),
              updatedAt: item.update_time ? new Date(item.update_time * 1000) : new Date(),
            });
          });

          totalSynced += data.items.length;
          offset += 100;

          // If ChatGPT returned fewer than 100 chats, we reached the end of history
          if (data.items.length < 100) hasMore = false;
        } else {
          hasMore = false;
        }
      } catch (e) {
        hasMore = false;
      }

      // Wait 1.5 seconds between requests so OpenAI doesn't rate-limit the user
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    console.log(`[AI Toolbox] Background sync complete. Grabbed ${totalSynced} older chats!`);
  }

  // ── ChatGPT SSE stream parser ─────────────────────────────────────────────
  async function handleChatGPTStream(response, url) {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';
    const messages = [];
    let chatId = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;

        try {
          const json = JSON.parse(raw);
          if (json.conversation_id) chatId = json.conversation_id;

          if (json.message?.content?.parts) {
            const role = json.message.author?.role || 'assistant';
            const content = json.message.content.parts.filter(p => typeof p === 'string').join('');
            if (content) {
              const existing = messages.findIndex(m => m.id === json.message.id);
              if (existing >= 0) messages[existing] = { id: json.message.id, role, content };
              else messages.push({ id: json.message.id, role, content });
            }
          }
        } catch (_) { }
      }
    }

    if (chatId) {
      const match = window.location.pathname.match(/\/c\/([a-z0-9-]+)/);
      if (match) chatId = match[1];

      dispatchChatEvent({
        id: `chatgpt_${chatId}`,
        platform: 'chatgpt',
        title: document.title.replace(' - ChatGPT', '').trim() || 'Untitled',
        url: `https://chatgpt.com/c/${chatId}`,
        messages,
        updatedAt: new Date(),
      });
    }
  }

  // ── Claude content extractor ──────────────────────────────────────────────
  function extractClaudeContent(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.filter(c => c.type === 'text').map(c => c.text || '').join('');
    }
    return '';
  }

  // ── Event bridge: MAIN → ISOLATED ─────────────────────────────────────────
  function dispatchChatEvent(chat) {
    window.dispatchEvent(new CustomEvent('at_chat_captured', {
      detail: chat,
      bubbles: false,
    }));
  }

})();