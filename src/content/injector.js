/**
 * ISOLATED World Content Script — Main Injector
 * 
 * This is the entry point that runs in the ISOLATED world (has access to
 * chrome.* APIs but NOT window.fetch directly).
 */

import { indexChat } from '../db/search-index.js';
import { upsertChat } from '../db/db.js';
import { SidebarUI } from './ui/sidebar.js';
import { SearchModal } from './ui/search-modal.js';
import { PromptMenu } from './ui/prompt-menu.js';
import { ExportButton } from './ui/export-btn.js';
import shadowCSS from '../styles/shadow.css?inline';

// ── Platform Detection ────────────────────────────────────────────────────────
const hostname = window.location.hostname;
const platform = hostname.includes('chatgpt.com') ? 'chatgpt'
  : hostname.includes('claude.ai') ? 'claude'
    : null;

if (!platform) {
  console.log('[AI Toolbox] Unknown platform, aborting injection.');
} else {
  init();
}

// ── Initialization ─────────────────────────────────────────────────────────────
async function init() {
  console.log(`[AI Toolbox] Initializing on ${platform}`);

  // Avoid double-injection on SPA navigations
  if (document.getElementById('ai-toolbox-root')) {
    console.log('[AI Toolbox] Already injected, skipping.');
    return;
  }

  // Wait for the sidebar to exist in the DOM
  const sidebar = await waitForElement(getSidebarSelector(platform), 10000);

  if (sidebar) {
    console.log('[AI Toolbox] Sidebar found:', sidebar.tagName, sidebar.className.slice(0, 60));
  } else {
    console.warn('[AI Toolbox] No sidebar found — injecting as floating panel');
  }

  // Create shadow DOM container
  const { host, shadowRoot } = createShadowHost(!!sidebar);

  if (sidebar) {
    // Inject at the very top of the sidebar
    sidebar.insertBefore(host, sidebar.firstChild);
  } else {
    // Fallback: fixed floating panel (bottom-left)
    host.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 16px;
      width: 240px;
      z-index: 999999;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      border-radius: 12px;
      overflow: hidden;
    `;
    document.body.appendChild(host);
  }

  // Inject CSS into shadow root (using native font stack to avoid CSP violations)
  const style = document.createElement('style');
  style.textContent = shadowCSS;
  shadowRoot.appendChild(style);

  // Render sidebar structure
  renderSidebarContainer(shadowRoot);

  // Initialize UI components
  const sidebarUI = new SidebarUI(shadowRoot, platform);
  const searchModal = new SearchModal(shadowRoot);
  const promptMenu = new PromptMenu(shadowRoot, platform);
  const exportBtn = new ExportButton(shadowRoot, platform);

  await sidebarUI.render();
  console.log('[AI Toolbox] UI rendered ✅');

  // Serialized queue for captured chat data from main-world.js
  let indexQueue = Promise.resolve();

  window.addEventListener('at_chat_captured', (e) => {
    const chat = e.detail;
    if (!chat?.id) return;

    indexQueue = indexQueue.then(async () => {
      try {
        await upsertChat(chat);
        await indexChat(chat);
        await sidebarUI.render();
      } catch (err) {
        console.warn('[AI Toolbox] Indexing error:', err);
      }
    });
  });

  // Handle SPA navigation — re-inject sidebar if it disappears
  observeNavigationChanges(sidebarUI, host, sidebar, shadowRoot, platform);

  // Platform-specific draggable chats + initial sidebar scrape
  enableDraggableChats(platform);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getSidebarSelector(platform) {
  return {
    chatgpt: [
      'nav[aria-label="Chat history"]',
      '[data-testid="sidebar-history"]',
      'nav[aria-label*="chat" i]',
      '[scrollable="true"]',
      'nav.flex-col',
      'aside',
      '#sidebar',
      'div[class*="sidebar"]',
    ].join(', '),
    claude: [
      '[data-testid="sidebar"]',
      'nav[aria-label="Conversation list"]',
      'nav[aria-label*="conversation" i]',
      'aside',
      'div[class*="sidebar"]',
      '#sidebar',
    ].join(', '),
  }[platform] || 'aside, nav';
}

function createShadowHost(inSidebar = true) {
  const host = document.createElement('div');
  host.id = 'ai-toolbox-root';
  if (inSidebar) {
    host.style.cssText = 'display:block; width:100%; position:relative; z-index:10;';
  }

  const shadowRoot = host.attachShadow({ mode: 'open' });
  return { host, shadowRoot };
}

function renderSidebarContainer(shadowRoot) {
  const container = document.createElement('div');
  container.id = 'at-sidebar';
  container.className = 'at-sidebar';
  shadowRoot.appendChild(container);
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const selectors = selector.split(',').map(s => s.trim());

    const tryFind = () => {
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el) return el;
      }
      return null;
    };

    const found = tryFind();
    if (found) return resolve(found);

    const observer = new MutationObserver(() => {
      const el = tryFind();
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

function observeNavigationChanges(sidebarUI, host, originalSidebar, shadowRoot, platform) {
  const observer = new MutationObserver(async () => {
    if (!document.contains(host)) {
      const sidebar = await waitForElement(getSidebarSelector(platform), 3000);
      if (sidebar) {
        sidebar.insertBefore(host, sidebar.firstChild);
        await sidebarUI.render();
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(() => sidebarUI.render(), 500);
    }
  });
  urlObserver.observe(document.body, { childList: true, subtree: true });
}

function enableDraggableChats(platform) {
  let linkSelector, idExtractor, urlBuilder;

  if (platform === 'chatgpt') {
    linkSelector = 'nav a[href^="/c/"]';
    idExtractor = (href) => href.match(/\/c\/([a-z0-9-]+)/i)?.[1];
    urlBuilder = (id) => `https://chatgpt.com/c/${id}`;
  } else if (platform === 'claude') {
    linkSelector = 'a[href^="/chat/"]';
    idExtractor = (href) => href.match(/\/chat\/([a-z0-9-]+)/i)?.[1];
    urlBuilder = (id) => `https://claude.ai/chat/${id}`;
  } else {
    return;
  }

  const makeLinks = () => {
    document.querySelectorAll(linkSelector).forEach(link => {
      if (link._atDraggable) return;
      link._atDraggable = true;
      link.draggable = true;

      const rawId = idExtractor(link.href);
      if (rawId) {
        const fullId = `${platform}_${rawId}`;
        const title = link.textContent?.trim() || 'Untitled';
        window.dispatchEvent(new CustomEvent('at_chat_captured', {
          detail: {
            id: fullId,
            platform,
            title,
            url: urlBuilder(rawId),
            messages: null,
            updatedAt: new Date(),
          }
        }));
      }

      link.addEventListener('dragstart', (e) => {
        const id = idExtractor(link.href);
        if (id) e.dataTransfer.setData('text/at-chat-id', `${platform}_${id}`);
      });
    });
  };

  const obs = new MutationObserver(makeLinks);
  obs.observe(document.body, { childList: true, subtree: true });
  makeLinks();
}