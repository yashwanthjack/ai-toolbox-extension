/**
 * MAIN World Network Interceptor
 * Injected at document_start with world: "MAIN"
 * 
 * Patches window.fetch to intercept AI platform API responses,
 * extract chat data, and dispatch it to the ISOLATED content script
 * via CustomEvent (the only bridge between MAIN and ISOLATED worlds).
 */

(function patchFetch() {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

      // ── ChatGPT: SSE conversation stream ─────────────────────────────────
      if (url.includes('chatgpt.com/backend-api/conversation') && !url.includes('gen_title')) {
        const cloned = response.clone();
        handleChatGPTStream(cloned, url).catch(console.error);
      }

      // ── ChatGPT: conversation list ────────────────────────────────────────
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
                messages: [],
                createdAt: item.create_time ? new Date(item.create_time * 1000) : new Date(),
                updatedAt: item.update_time ? new Date(item.update_time * 1000) : new Date(),
              });
            });
          }
        }).catch(() => {});
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
              messages: [],
              createdAt: convo.created_at ? new Date(convo.created_at) : new Date(),
              updatedAt: convo.updated_at ? new Date(convo.updated_at) : new Date(),
            });
          });
        }).catch(() => {});
      }

      // ── Claude: single conversation with messages ─────────────────────────
      if (url.includes('claude.ai/api/organizations') && url.includes('/conversations/') && !url.includes('/messages')) {
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
        }).catch(() => {});
      }

    } catch (e) {
      // Never break the page's own fetch
    }

    return response;
  };

  // ── ChatGPT SSE stream parser ─────────────────────────────────────────────
  async function handleChatGPTStream(response, url) {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';
    const messages = [];
    let chatId = '';
    let conversationTitle = '';

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

          // Extract message from delta
          if (json.message?.content?.parts) {
            const role = json.message.author?.role || 'assistant';
            const content = json.message.content.parts
              .filter(p => typeof p === 'string')
              .join('');
            if (content) {
              // Update or append message
              const existing = messages.findIndex(m => m.id === json.message.id);
              if (existing >= 0) messages[existing] = { id: json.message.id, role, content };
              else messages.push({ id: json.message.id, role, content });
            }
          }
        } catch (_) {}
      }
    }

    if (chatId) {
      // Fetch title separately from URL
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
      return content
        .filter(c => c.type === 'text')
        .map(c => c.text || '')
        .join('');
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
