/**
 * ISOLATED World Content Script — Main Injector
 * 
 * This is the entry point that runs in the ISOLATED world (has access to
 * chrome.* APIs but NOT window.fetch directly).
 * 
 * It:
 * 1. Detects the platform (ChatGPT vs Claude)
 * 2. Waits for the sidebar DOM to appear
 * 3. Creates a Shadow DOM container and injects all UI
 * 4. Listens for chat data dispatched by main-world.js
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
               : hostname.includes('claude.ai')   ? 'claude'
               : null;

if (!platform) {
  console.log('[AI Toolbox] Unknown platform, aborting injection.');
} else {
  init();
}

// ── Initialization ─────────────────────────────────────────────────────────────
async function init() {
  console.log(`[AI Toolbox] Initializing on ${platform}`);

  // Wait for the sidebar to exist in the DOM
  const sidebar = await waitForElement(getSidebarSelector(platform), 8000);
  if (!sidebar) {
    console.warn('[AI Toolbox] Sidebar not found, retrying on navigation...');
  }

  // Create shadow DOM container
  const { host, shadowRoot } = createShadowHost();

  // Inject above the sidebar (or fallback to body)
  if (sidebar) {
    sidebar.insertBefore(host, sidebar.firstChild);
  } else {
    document.body.appendChild(host);
  }

  // Inject CSS into shadow root
  const style = document.createElement('style');
  style.textContent = shadowCSS;
  shadowRoot.appendChild(style);

  // Render sidebar structure
  renderSidebarContainer(shadowRoot);

  // Initialize UI components
  const sidebarUI  = new SidebarUI(shadowRoot, platform);
  const searchModal = new SearchModal(shadowRoot);
  const promptMenu  = new PromptMenu(shadowRoot, platform);
  const exportBtn   = new ExportButton(shadowRoot, platform);

  await sidebarUI.render();

  // Listen for captured chat data from main-world.js
  window.addEventListener('at_chat_captured', async (e) => {
    const chat = e.detail;
    if (!chat?.id) return;
    console.log(`[AI Toolbox] Captured chat: ${chat.title} (${chat.platform})`);
    await indexChat(chat);
    // Re-render sidebar to reflect any new/updated chats
    await sidebarUI.render();
  });

  // Handle SPA navigation — re-inject sidebar if it disappears
  observeNavigationChanges(sidebarUI, host, sidebar, shadowRoot, platform);

  // Platform-specific draggable chats
  enableDraggableChats(platform);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getSidebarSelector(platform) {
  return {
    chatgpt: 'nav[aria-label="Chat history"], nav.flex-col, aside, [data-testid="sidebar-history"]',
    claude:  '[data-testid="sidebar"], nav[aria-label="Conversation list"], aside',
  }[platform] || 'aside';
}

function createShadowHost() {
  const host = document.createElement('div');
  host.id = 'ai-toolbox-root';
  host.style.cssText = 'display:block; width:100%; position:relative; z-index:10;';

  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Load Inter font inside shadow DOM
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
  shadowRoot.appendChild(fontLink);

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
  // Watch for sidebar being removed/replaced (SPA nav)
  const observer = new MutationObserver(async () => {
    if (!document.contains(host)) {
      // Re-inject
      const sidebar = await waitForElement(getSidebarSelector(platform), 3000);
      if (sidebar) {
        sidebar.insertBefore(host, sidebar.firstChild);
        await sidebarUI.render();
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Re-render on URL changes
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
  const linkSelector = platform === 'chatgpt'
    ? 'nav a[href^="/c/"]'
    : 'a[href^="/chat/"]';

  const idExtractor = platform === 'chatgpt'
    ? (href) => href.match(/\/c\/([a-z0-9-]+)/i)?.[1]
    : (href) => href.match(/\/chat\/([a-z0-9-]+)/i)?.[1];

  const makeLinks = () => {
    document.querySelectorAll(linkSelector).forEach(link => {
      if (link._atDraggable) return;
      link._atDraggable = true;
      link.draggable = true;
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
