import MiniSearch from 'minisearch';
import { db, upsertChat } from './db.js';

/**
 * MiniSearch full-text index for AI chats.
 * Indexes: title + message content
 * Sub-10ms search across 10,000+ messages.
 */

let searchIndex = null;
let indexReady = false;

function createIndex() {
  return new MiniSearch({
    fields: ['title', 'content'],      // fields to index
    storeFields: ['id', 'platform', 'title', 'url', 'updatedAt'], // fields to return
    idField: 'id',
    searchOptions: {
      boost: { title: 2 },             // title matches rank higher
      fuzzy: 0.2,                      // tolerate minor typos
      prefix: true,
    },
  });
}

// ─── Initialize index from IndexedDB ─────────────────────────────────────────
export async function initSearchIndex() {
  searchIndex = createIndex();
  const chats = await db.chats.toArray();

  const docs = chats.map(chat => ({
    id: chat.id,
    platform: chat.platform,
    title: chat.title || '',
    url: chat.url || '',
    updatedAt: chat.updatedAt,
    content: (chat.messages || [])
      .map(m => m.content || '')
      .join(' ')
      .slice(0, 50000), // cap at 50KB per chat to keep index lean
  }));

  if (docs.length > 0) {
    searchIndex.addAll(docs);
  }
  indexReady = true;
  console.log(`[AI Toolbox] Search index ready: ${docs.length} chats indexed`);
}

// ─── Add or update a chat in the index ───────────────────────────────────────
export async function indexChat(chat) {
  if (!indexReady || !searchIndex) await initSearchIndex();

  const doc = {
    id: chat.id,
    platform: chat.platform,
    title: chat.title || '',
    url: chat.url || '',
    updatedAt: chat.updatedAt || new Date(),
    content: (chat.messages || [])
      .map(m => m.content || '')
      .join(' ')
      .slice(0, 50000),
  };

  // MiniSearch has no update — remove then re-add
  try { searchIndex.remove({ id: doc.id }); } catch (_) { /* new doc */ }
  searchIndex.add(doc);

  // Also persist to IndexedDB
  await upsertChat(chat);
}

// ─── Search ───────────────────────────────────────────────────────────────────
export async function searchChats(query, { platform, limit = 20 } = {}) {
  if (!indexReady || !searchIndex) await initSearchIndex();
  if (!query || query.trim().length < 2) return [];

  let results = searchIndex.search(query, {
    filter: platform ? (result) => result.platform === platform : undefined,
  });

  // Group by platform
  const grouped = {};
  for (const result of results.slice(0, limit)) {
    if (!grouped[result.platform]) grouped[result.platform] = [];
    grouped[result.platform].push(result);
  }

  return grouped;
}

// ─── Remove a chat from the index ────────────────────────────────────────────
export function removeFromIndex(chatId) {
  if (!searchIndex) return;
  try { searchIndex.remove({ id: chatId }); } catch (_) { /* not in index */ }
}

export function getIndexStatus() {
  return {
    ready: indexReady,
    count: searchIndex ? searchIndex.documentCount : 0,
  };
}
