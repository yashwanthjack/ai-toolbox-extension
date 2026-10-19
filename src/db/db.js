import Dexie from 'dexie';

/**
 * AI Toolbox — Hybrid Local Database
 * - Heavy chat logs live in IndexedDB (Dexie)
 * - Folders, Prompts, Settings & Counts sync via chrome.storage.local
 *   with fallback to Dexie to prevent data blocking.
 */
export const db = new Dexie('AIToolbox');

db.version(1).stores({
  chats: '&id, platform, folderId, isPinned, createdAt, updatedAt',
  folders: '&id, platform, order',
  prompts: '&id, usageCount, createdAt',
  settings: '&key',
});

const hasChromeStorage = () => typeof chrome !== 'undefined' && !!chrome?.storage?.local;

async function syncStatsToChromeStorage() {
  if (!hasChromeStorage()) return;
  try {
    const chats = await db.chats.toArray();
    const platform = window.location.hostname.includes('claude') ? 'claude'
      : window.location.hostname.includes('chatgpt') ? 'chatgpt'
        : null;
    if (!platform) return;

    const stored = await chrome.storage.local.get(['at_chats_meta']);
    const metaMap = stored.at_chats_meta || {};

    chats.forEach(c => {
      metaMap[c.id] = {
        id: c.id,
        platform: c.platform,
        title: c.title,
        url: c.url,
        folderId: c.folderId || null,
        isPinned: Boolean(c.isPinned),
        updatedAt: c.updatedAt,
      };
    });

    const allMeta = Object.values(metaMap);
    await chrome.storage.local.set({
      at_chats_meta: metaMap,
      stat_chats: allMeta.length,
    });
  } catch (e) {
    console.warn('[AI Toolbox] Stat sync error:', e);
  }
}

// ─── Helper: upsert a chat ───────────────────────────────────────────────────
export async function upsertChat(chat) {
  if (!chat?.id) return;
  const existing = await db.chats.get(chat.id);

  if (existing) {
    const updates = {
      title: (chat.title && chat.title !== 'Untitled') ? chat.title : existing.title,
      url: chat.url || existing.url,
      updatedAt: chat.updatedAt || new Date(),
    };
    if (Array.isArray(chat.messages) && chat.messages.length > 0) {
      updates.messages = chat.messages;
    }
    await db.chats.update(chat.id, updates);
  } else {
    await db.chats.add({
      id: chat.id,
      platform: chat.platform || 'chatgpt',
      title: chat.title || 'Untitled',
      url: chat.url || window.location.href,
      messages: Array.isArray(chat.messages) ? chat.messages : [],
      folderId: chat.folderId || null,
      isPinned: Boolean(chat.isPinned),
      createdAt: chat.createdAt || new Date(),
      updatedAt: chat.updatedAt || new Date(),
    });
  }

  await syncStatsToChromeStorage();
}

// ─── Helper: get all chats ───────────────────────────────────────────────────
export async function getAllChats(platform) {
  const localChats = await (platform
    ? db.chats.where('platform').equals(platform).toArray()
    : db.chats.toArray());

  if (localChats.length === 0 && hasChromeStorage()) {
    const stored = await chrome.storage.local.get(['at_chats_meta']);
    const allMeta = Object.values(stored.at_chats_meta || {});
    return platform ? allMeta.filter(c => c.platform === platform) : allMeta;
  }

  return localChats;
}

// ─── Helper: get chats in folder ─────────────────────────────────────────────
export async function getChatsInFolder(folderId) {
  return db.chats.where('folderId').equals(folderId).toArray();
}

// ─── Helper: move chat to folder ─────────────────────────────────────────────
export async function moveChatToFolder(chatId, folderId) {
  const existing = await db.chats.get(chatId);
  if (existing) {
    await db.chats.update(chatId, { folderId, updatedAt: new Date() });
  } else {
    const platform = chatId.startsWith('claude_') ? 'claude' : 'chatgpt';
    const rawId = chatId.replace(/^(chatgpt_|claude_)/, '');
    await db.chats.add({
      id: chatId,
      platform,
      title: 'Saved Chat',
      url: platform === 'chatgpt' ? `https://chatgpt.com/c/${rawId}` : `https://claude.ai/chat/${rawId}`,
      messages: [],
      folderId,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

// ─── Helper: toggle pin ──────────────────────────────────────────────────────
export async function togglePin(chatId) {
  const chat = await db.chats.get(chatId);
  if (chat) {
    const nextPinned = !chat.isPinned;
    await db.chats.update(chatId, { isPinned: nextPinned, updatedAt: new Date() });
    return nextPinned;
  }
  return false;
}

// ─── Folder helpers (with Dexie fallback) ────────────────────────────────────
export async function getFolders(platform) {
  let all = [];
  try {
    if (hasChromeStorage()) {
      const res = await chrome.storage.local.get(['at_folders']);
      all = res.at_folders || [];
    }
  } catch (e) { }

  if (all.length === 0) {
    all = await db.folders.orderBy('order').toArray();
  }

  all.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (platform && platform !== 'all') {
    return all.filter(f => f.platform === platform || f.platform === 'all');
  }
  return all;
}

export async function createFolder({ name, platform = 'all' }) {
  const all = await getFolders('all');
  const id = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newFolder = { id, name, platform, order: all.length, createdAt: new Date().toISOString() };
  all.push(newFolder);

  if (hasChromeStorage()) {
    await chrome.storage.local.set({ at_folders: all, stat_folders: all.length });
  }
  await db.folders.put(newFolder);
  return id;
}

export async function renameFolder(id, name) {
  const all = await getFolders('all');
  const updated = all.map(f => (f.id === id ? { ...f, name } : f));
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ at_folders: updated });
  }
  await db.folders.update(id, { name });
}

export async function deleteFolder(id) {
  const all = await getFolders('all');
  const updated = all.filter(f => f.id !== id);
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ at_folders: updated, stat_folders: updated.length });
  }
  await db.folders.delete(id);
  await db.chats.where('folderId').equals(id).modify(chat => { delete chat.folderId; });
}

// ─── Prompt helpers (with Dexie fallback) ────────────────────────────────────
export async function getPrompts() {
  let list = [];
  try {
    if (hasChromeStorage()) {
      const res = await chrome.storage.local.get(['at_prompts']);
      list = res.at_prompts || [];
    }
  } catch (e) { }

  if (list.length === 0) {
    list = await db.prompts.orderBy('usageCount').reverse().toArray();
  }

  return list.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
}

export async function createPrompt({ title, body, tags = [] }) {
  const all = await getPrompts();
  const id = `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newPrompt = { id, title, body, tags, usageCount: 0, createdAt: new Date().toISOString() };
  all.push(newPrompt);

  if (hasChromeStorage()) {
    await chrome.storage.local.set({ at_prompts: all, stat_prompts: all.length });
  }
  await db.prompts.put(newPrompt);
  return id;
}

export async function updatePrompt(id, changes) {
  const all = await getPrompts();
  const updated = all.map(p => (p.id === id ? { ...p, ...changes } : p));
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ at_prompts: updated });
  }
  await db.prompts.update(id, changes);
}

export async function deletePrompt(id) {
  const all = await getPrompts();
  const updated = all.filter(p => p.id !== id);
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ at_prompts: updated, stat_prompts: updated.length });
  }
  await db.prompts.delete(id);
}

export async function incrementPromptUsage(id) {
  const all = await getPrompts();
  const updated = all.map(p => (p.id === id ? { ...p, usageCount: (p.usageCount || 0) + 1 } : p));
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ at_prompts: updated });
  }
  const p = await db.prompts.get(id);
  if (p) await db.prompts.update(id, { usageCount: (p.usageCount || 0) + 1 });
}

// ─── Settings helpers ────────────────────────────────────────────────────────
export async function getSetting(key, defaultValue = null) {
  if (hasChromeStorage()) {
    const res = await chrome.storage.local.get([`setting_${key}`]);
    if (res[`setting_${key}`] !== undefined) return res[`setting_${key}`];
  }
  const row = await db.settings.get(key);
  return row ? row.value : defaultValue;
}

export async function setSetting(key, value) {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [`setting_${key}`]: value });
  }
  await db.settings.put({ key, value });
}

// ─── Free tier limits ────────────────────────────────────────────────────────
export const FREE_LIMITS = {
  folders: 10,
  prompts: 20,
  searchResults: 5,
};

export async function checkLimit(resource) {
  const tier = await getSetting('tier', 'free');
  if (tier === 'pro') return { allowed: true };

  let count = 0;
  if (resource === 'folders') count = (await getFolders('all')).length;
  else if (resource === 'prompts') count = (await getPrompts()).length;
  else count = await db[resource].count();

  const limit = FREE_LIMITS[resource];
  return { allowed: count < limit, count, limit };
}