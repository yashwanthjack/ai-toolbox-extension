import Dexie from 'dexie';

/**
 * AI Toolbox — Local IndexedDB Database
 * All chat data stays 100% on the user's device.
 */
export const db = new Dexie('AIToolbox');

db.version(1).stores({
  // Primary key + indexed fields
  chats:   '&id, platform, folderId, isPinned, createdAt, updatedAt',
  folders: '&id, platform, order',
  prompts: '&id, usageCount, createdAt',
  settings: '&key',
});

// ─── Helper: upsert a chat ───────────────────────────────────────────────────
export async function upsertChat(chat) {
  const existing = await db.chats.get(chat.id);
  if (existing) {
    await db.chats.update(chat.id, {
      ...chat,
      updatedAt: new Date(),
    });
  } else {
    await db.chats.add({
      folderId: null,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...chat,
    });
  }
}

// ─── Helper: get all chats ───────────────────────────────────────────────────
export async function getAllChats(platform) {
  if (platform) return db.chats.where('platform').equals(platform).toArray();
  return db.chats.toArray();
}

// ─── Helper: get chats in folder ────────────────────────────────────────────
export async function getChatsInFolder(folderId) {
  return db.chats.where('folderId').equals(folderId).toArray();
}

// ─── Helper: move chat to folder ─────────────────────────────────────────────
export async function moveChatToFolder(chatId, folderId) {
  await db.chats.update(chatId, { folderId, updatedAt: new Date() });
}

// ─── Helper: toggle pin ──────────────────────────────────────────────────────
export async function togglePin(chatId) {
  const chat = await db.chats.get(chatId);
  if (chat) await db.chats.update(chatId, { isPinned: !chat.isPinned, updatedAt: new Date() });
  return !chat?.isPinned;
}

// ─── Folder helpers ──────────────────────────────────────────────────────────
export async function createFolder({ name, platform = 'all' }) {
  const count = await db.folders.count();
  const id = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await db.folders.add({ id, name, platform, order: count, createdAt: new Date() });
  return id;
}

export async function renameFolder(id, name) {
  await db.folders.update(id, { name });
}

export async function deleteFolder(id) {
  await db.folders.delete(id);
  // Un-assign chats from this folder
  await db.chats.where('folderId').equals(id).modify({ folderId: null });
}

export async function getFolders(platform) {
  const all = await db.folders.orderBy('order').toArray();
  if (platform && platform !== 'all') {
    return all.filter(f => f.platform === platform || f.platform === 'all');
  }
  return all;
}

// ─── Prompt helpers ──────────────────────────────────────────────────────────
export async function createPrompt({ title, body, tags = [] }) {
  const id = `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await db.prompts.add({ id, title, body, tags, usageCount: 0, createdAt: new Date() });
  return id;
}

export async function getPrompts() {
  return db.prompts.orderBy('usageCount').reverse().toArray();
}

export async function updatePrompt(id, changes) {
  await db.prompts.update(id, changes);
}

export async function deletePrompt(id) {
  await db.prompts.delete(id);
}

export async function incrementPromptUsage(id) {
  const p = await db.prompts.get(id);
  if (p) await db.prompts.update(id, { usageCount: (p.usageCount || 0) + 1 });
}

// ─── Settings helpers ────────────────────────────────────────────────────────
export async function getSetting(key, defaultValue = null) {
  const row = await db.settings.get(key);
  return row ? row.value : defaultValue;
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}

// ─── Free tier limits ─────────────────────────────────────────────────────────
export const FREE_LIMITS = {
  folders: 10,
  prompts: 20,
  searchResults: 5,
};

export async function checkLimit(resource) {
  const tier = await getSetting('tier', 'free');
  if (tier === 'pro') return { allowed: true };
  const count = await db[resource].count();
  const limit = FREE_LIMITS[resource];
  return { allowed: count < limit, count, limit };
}
