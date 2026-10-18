/**
 * Claude Platform Module
 * Handles Claude-specific sidebar injection and DOM selectors.
 */

export const CLAUDE_PLATFORM = 'claude';

/**
 * Find Claude's sidebar element.
 */
export function findClaudeSidebar() {
  const selectors = [
    '[data-testid="sidebar"]',
    'nav[aria-label="Conversation list"]',
    '.ConversationList',
    'aside',
    '.flex-col.h-full.overflow-hidden',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

/**
 * Get current Claude chat ID from URL.
 * Claude URL format: claude.ai/chat/{uuid}
 */
export function getClaudeChatId() {
  const match = window.location.pathname.match(/\/chat\/([a-z0-9-]+)/i);
  return match ? `claude_${match[1]}` : null;
}

/**
 * Make Claude conversation list items draggable.
 */
export function makeChatsGraggable() {
  const observer = new MutationObserver(() => {
    const chatLinks = document.querySelectorAll('a[href^="/chat/"]');
    chatLinks.forEach(link => {
      if (link._atDraggable) return;
      link._atDraggable = true;
      link.draggable = true;

      link.addEventListener('dragstart', (e) => {
        const chatId = link.href.match(/\/chat\/([a-z0-9-]+)/i)?.[1];
        if (chatId) {
          e.dataTransfer.setData('text/at-chat-id', `claude_${chatId}`);
          e.dataTransfer.effectAllowed = 'move';
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Watch Claude SPA navigation.
 */
export function watchNavigation(callback) {
  let lastPath = window.location.pathname;

  const observer = new MutationObserver(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      callback(lastPath);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', () => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      callback(lastPath);
    }
  });
}
