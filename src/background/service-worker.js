/**
 * Background Service Worker
 * 
 * MV3 service workers are stateless and event-driven.
 * Handles:
 * - Keyboard shortcut → open search modal
 * - Tab navigation events
 * - Message routing between content scripts
 */

// ── Extension Install ──────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    console.log('[AI Toolbox] Installed! Setting up defaults...');

    // Set free tier as default
    await chrome.storage.local.set({
      tier: 'free',
      installedAt: new Date().toISOString(),
      version: chrome.runtime.getManifest().version,
    });

    // Open welcome page
    chrome.tabs.create({
      url: 'https://chatgpt.com',
      active: true,
    });
  }

  if (reason === 'update') {
    console.log('[AI Toolbox] Updated to', chrome.runtime.getManifest().version);
  }
});

// ── Keyboard Command ───────────────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-search') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'OPEN_SEARCH' }).catch(() => {
        // Tab might not have content script (non-AI page)
      });
    }
  }
});

// ── Message Routing ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TIER') {
    chrome.storage.local.get('tier', (result) => {
      sendResponse({ tier: result.tier || 'free' });
    });
    return true;
  }

  if (message.type === 'SET_TIER') {
    chrome.storage.local.set({ tier: message.tier }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'GET_STATS') {
    chrome.storage.local.get(null, (items) => {
      sendResponse({ stats: items });
    });
    return true;
  }
});

// ── Context Menu (Wrapped in removeAll to prevent duplicate ID errors) ─────────
chrome.runtime.onStartup.addListener(() => {
  setupContextMenu();
});

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu();
});

function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'at-search',
      title: '🔍 Search AI Chats (AI Toolbox)',
      contexts: ['page'],
      documentUrlPatterns: ['https://chatgpt.com/*', 'https://claude.ai/*'],
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'at-search' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'OPEN_SEARCH' }).catch(() => { });
  }
});