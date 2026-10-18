/**
 * ChatGPT Platform Module
 * Handles ChatGPT-specific sidebar injection and DOM selectors.
 */

export const CHATGPT_PLATFORM = 'chatgpt';

/**
 * Find ChatGPT's sidebar element and inject our container above it.
 * Returns { sidebarEl, chatListEl } or null if not found.
 */
export function findChatGPTSidebar() {
  // ChatGPT sidebar — may update as OpenAI changes their DOM
  const selectors = [
    'nav[aria-label="Chat history"]',
    '[data-testid="sidebar-history"]',
    'nav.flex-col',
    'aside',
    '.relative.flex-col.h-full',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

/**
 * Get the current ChatGPT chat ID from the URL.
 */
export function getChatGPTChatId() {
  const match = window.location.pathname.match(/\/c\/([a-z0-9-]+)/i);
  return match ? `chatgpt_${match[1]}` : null;
}

/**
 * Make ChatGPT chat list items draggable so users can drag them
 * into our folder items.
 */
export function makeChatsGraggable() {
  const observer = new MutationObserver(() => {
    const chatLinks = document.querySelectorAll('nav a[href^="/c/"]');
    chatLinks.forEach(link => {
      if (link._atDraggable) return;
      link._atDraggable = true;
      link.draggable = true;

      link.addEventListener('dragstart', (e) => {
        const chatId = link.href.match(/\/c\/([a-z0-9-]+)/i)?.[1];
        if (chatId) {
          e.dataTransfer.setData('text/at-chat-id', `chatgpt_${chatId}`);
          e.dataTransfer.effectAllowed = 'move';
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Watch for page navigation changes (SPA — ChatGPT is a Next.js app).
 * Calls callback(newPath) on URL change.
 */
export function watchNavigation(callback) {
  let lastPath = window.location.pathname;

  // Intercept history API
  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = function (...args) {
    origPush(...args);
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      callback(lastPath);
    }
  };

  history.replaceState = function (...args) {
    origReplace(...args);
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      callback(lastPath);
    }
  };

  window.addEventListener('popstate', () => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      callback(lastPath);
    }
  });
}
