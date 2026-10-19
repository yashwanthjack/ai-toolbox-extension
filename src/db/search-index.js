import MiniSearch from 'minisearch';
import { db, upsertChat } from './db.js';

/**
 * MiniSearch full-text index for AI chats.
 * Indexes: title + content
 * Sub-10ms search across 10,000+ messages.
 *
 * Key fix: `content` is now in storeFields so we can extract snippets
 * in the search modal. The `searchChats` function groups results by
 * platform and returns them as { chatgpt: [...], claude: [...] }.
 */

let searchIndex = null;
let indexReady = false;

function createIndex() {
  return new MiniSearch({
    fields: ['title', 'content'],                                          // fields to index
    storeFields: ['id', 'platform', 'title', 'url', 'updatedAt', 'content'], // fields to return in results
    idField: 'id',
    searchOptions: {
      boost: { title: 2 },                                                 // title matches rank higher
      fuzzy: 0.2,                                                          // tolerate minor typos
      prefix: true,
    },
  });
}

// ─── Initialize index from IndexedDB ─────────────────────────────────────────
export async function initSearchIndex() {
  // Prevent re-initialization if already built
  if (searchIndex && indexReady) return;

  searchIndex = createIndex();
  indexReady = false;

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

/**
 * Force a full rebuild of the index. Use after bulk imports or
 * when index seems stale.
 */
export async function rebuildIndex() {
  indexReady = false;
  searchIndex = null;
  await initSearchIndex();
}

// ─── Add or update a chat in the index ───────────────────────────────────────
export async function indexChat(chat) {
  if (!indexReady || !searchIndex) await initSearchIndex();

  // If chat incoming has no messages, try to retain existing messages from IndexedDB
  let messageContent = '';
  if (Array.isArray(chat.messages) && chat.messages.length > 0) {
    messageContent = chat.messages.map(m => m.content || '').join(' ').slice(0, 50000);
  } else {
    const existing = await db.chats.get(chat.id);
    if (existing?.messages?.length) {
      messageContent = existing.messages.map(m => m.content || '').join(' ').slice(0, 50000);
    }
  }

  const doc = {
    id: chat.id,
    platform: chat.platform,
    title: chat.title || '',
    url: chat.url || '',
    updatedAt: chat.updatedAt || new Date(),
    content: messageContent,
  };

  // MiniSearch: use replace if document ID is already indexed, otherwise add
  if (searchIndex.has(doc.id)) {
    searchIndex.replace(doc);
  } else {
    searchIndex.add(doc);
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────
/**
 * Unified cross-origin search.
 *
 * 1. Queries the local MiniSearch index (deep content search on current domain).
 * 2. Fetches `at_chats_meta` from chrome.storage.local (shared across ALL origins).
 * 3. Performs a fuzzy title search against cross-origin chat metadata.
 * 4. Merges + deduplicates by chat.id.
 * 5. Groups by platform → { chatgpt: [...], claude: [...] }
 *
 * This means pressing Ctrl+Shift+F on chatgpt.com will still show Claude
 * results (title-matched) and vice versa.
 */
export async function searchChats(query, { platform, limit = 20 } = {}) {
  if (!indexReady || !searchIndex) await initSearchIndex();
  if (!query || query.trim().length < 1) return {};

  const q = query.trim().toLowerCase();

  // ── Step 1: Deep content search on local MiniSearch index ──────────
  const localResults = searchIndex.search(query, {
    filter: platform ? (result) => result.platform === platform : undefined,
  });

  // Collect IDs we already have from MiniSearch to deduplicate later
  const seenIds = new Set();
  const merged = [];

  for (const result of localResults) {
    if (seenIds.has(result.id)) continue;
    seenIds.add(result.id);
    merged.push(result);
  }

  // ── Step 2 + 3: Cross-origin title search via chrome.storage.local ─
  try {
    const hasChromeStorage =
      typeof chrome !== 'undefined' && !!chrome?.storage?.local;

    if (hasChromeStorage) {
      const stored = await chrome.storage.local.get(['at_chats_meta']);
      const metaMap = stored.at_chats_meta || {};
      const allMeta = Object.values(metaMap);

      // Split query into individual terms for fuzzy matching
      const terms = q.split(/\s+/).filter(Boolean);

      for (const meta of allMeta) {
        // Skip if already in local results
        if (seenIds.has(meta.id)) continue;

        // Optional platform filter
        if (platform && meta.platform !== platform) continue;

        // Fuzzy title match: every query term must appear in the title
        const titleLower = (meta.title || '').toLowerCase();
        const matches = terms.every(term => titleLower.includes(term));

        if (matches) {
          seenIds.add(meta.id);
          merged.push({
            id: meta.id,
            platform: meta.platform,
            title: meta.title || 'Untitled',
            url: meta.url || '',
            updatedAt: meta.updatedAt || null,
            content: '',       // no content available cross-origin (title-only match)
            score: 0.5,        // lower score than deep content matches
            _crossOrigin: true, // flag for debugging
          });
        }
      }
    }
  } catch (e) {
    console.warn('[AI Toolbox] Cross-origin meta search failed:', e);
  }

  // ── Step 4: Sort by score descending, then limit ──────────────────
  merged.sort((a, b) => (b.score || 0) - (a.score || 0));

  // ── Step 5: Group by platform ─────────────────────────────────────
  const grouped = {};
  let count = 0;
  for (const result of merged) {
    if (count >= limit) break;
    if (!grouped[result.platform]) grouped[result.platform] = [];
    grouped[result.platform].push(result);
    count++;
  }

  return grouped;
}

// ─── Remove a chat from the index ────────────────────────────────────────────
export function removeFromIndex(chatId) {
  if (!searchIndex) return;
  if (searchIndex.has(chatId)) {
    searchIndex.discard(chatId);
  }
}

export function getIndexStatus() {
  return {
    ready: indexReady,
    count: searchIndex ? searchIndex.documentCount : 0,
  };
}