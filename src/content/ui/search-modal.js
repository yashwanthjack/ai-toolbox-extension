import { searchChats, initSearchIndex } from '../../db/search-index.js';
import { getSetting } from '../../db/db.js';

/**
 * Ctrl+Shift+F / Alt+K  — Global Search Modal
 * Opens as an overlay on ChatGPT / Claude pages.
 * Searches the local MiniSearch index across both platforms.
 *
 * Fixed bugs:
 * 1. Event Isolation: keydown/keyup on overlay call stopPropagation()
 *    so ChatGPT's React handlers never see them.
 * 2. Results grouped by platform with badge headers.
 * 3. _highlight() wraps matches in <mark class="at-highlight">.
 * 4. ArrowUp/Down/Enter keyboard nav with selectedIndex across flat results.
 *    Enter opens in new tab via window.open(url, '_blank').
 * 5. Clean empty state: 'No matches found for "<query>"'.
 */
export class SearchModal {
  constructor(shadowRoot) {
    this.shadow = shadowRoot;
    this.isOpen = false;
    this.selectedIndex = 0;
    this.results = {};
    this.flatResults = [];
    this.debounceTimer = null;
    this.lastQuery = '';
    this._setupKeyboardShortcut();
  }

  /* ─── Global shortcut to open/close ──────────────────────────────────── */
  _setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl+Shift+F  or  Alt+K
      const isTrigger =
        (mod && e.shiftKey && e.key.toLowerCase() === 'f') ||
        (e.altKey && e.key.toLowerCase() === 'k');

      if (isTrigger) {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
        return;
      }

      // Escape closes the modal from anywhere
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    });

    // Service-worker command
    try {
      chrome.runtime?.onMessage?.addListener((msg) => {
        if (msg.type === 'OPEN_SEARCH') this.open();
      });
    } catch (_) { /* no runtime in non-extension context */ }
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  /* ─── Open ──────────────────────────────────────────────────────────── */
  async open() {
    if (this.isOpen) return;
    this.isOpen = true;

    // Pre-warm the index (no-op if already built)
    await initSearchIndex();

    const overlay = document.createElement('div');
    overlay.className = 'at-search-overlay';
    overlay.id = 'at-search-overlay';
    overlay.innerHTML = this._renderModal();
    this.shadow.appendChild(overlay);

    // ── CRITICAL: Event isolation ──────────────────────────────────────
    // Stop ALL keyboard events from leaking out of the overlay into the
    // host page.  ChatGPT's React app attaches its own keydown listeners
    // to <body> and steals focus / inserts characters when our modal is
    // open.  Calling stopPropagation on the overlay prevents that.
    overlay.addEventListener('keydown', (e) => e.stopPropagation(), true);
    overlay.addEventListener('keyup',   (e) => e.stopPropagation(), true);
    overlay.addEventListener('keypress', (e) => e.stopPropagation(), true);

    const input = this.shadow.getElementById('at-search-input');
    input?.focus();

    this._bindModalEvents(overlay);
  }

  /* ─── Close ─────────────────────────────────────────────────────────── */
  close() {
    this.isOpen = false;
    this.selectedIndex = 0;
    this.results = {};
    this.flatResults = [];
    this.lastQuery = '';
    clearTimeout(this.debounceTimer);
    const overlay = this.shadow.getElementById('at-search-overlay');
    overlay?.remove();
  }

  /* ─── Modal HTML ────────────────────────────────────────────────────── */
  _renderModal() {
    return `
      <div class="at-search-modal" role="dialog" aria-label="AI Toolbox Search">
        <div class="at-search-header">
          <span class="at-search-icon">🔍</span>
          <input
            class="at-search-input"
            id="at-search-input"
            type="text"
            placeholder="Search across ChatGPT &amp; Claude..."
            autocomplete="off"
            spellcheck="false"
          />
          <span class="at-search-shortcut">Esc</span>
        </div>
        <div class="at-search-platform-pills" id="at-search-pills" style="display:none;"></div>
        <div class="at-search-results" id="at-search-results">
          <div class="at-search-empty" id="at-search-placeholder">
            Start typing to search your AI chats…
          </div>
        </div>
        <div class="at-search-footer">
          <span><span class="at-kbd">↑↓</span> Navigate</span>
          <span><span class="at-kbd">↵</span> Open</span>
          <span><span class="at-kbd">Esc</span> Close</span>
          <span style="margin-left:auto;"><span class="at-kbd">Ctrl+Shift+F</span></span>
        </div>
      </div>
    `;
  }

  /* ─── Bind modal events ─────────────────────────────────────────────── */
  _bindModalEvents(overlay) {
    const input = this.shadow.getElementById('at-search-input');
    const resultsContainer = this.shadow.getElementById('at-search-results');

    // Close on overlay backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Debounced search on input
    input?.addEventListener('input', () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this._performSearch(input.value.trim());
      }, 120);
    });

    // Keyboard navigation: ↑ ↓ Enter Escape
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.flatResults.length > 0) {
          this.selectedIndex = Math.min(this.selectedIndex + 1, this.flatResults.length - 1);
          this._updateSelection();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.flatResults.length > 0) {
          this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
          this._updateSelection();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = this.flatResults[this.selectedIndex];
        if (selected?.url) {
          this._openChat(selected.url);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });

    // Click on result row
    resultsContainer?.addEventListener('click', (e) => {
      const resultEl = e.target.closest('.at-search-result');
      if (resultEl?.dataset.url) {
        this._openChat(resultEl.dataset.url);
      }
    });
  }

  /* ─── Open chat in new tab ──────────────────────────────────────────── */
  _openChat(url) {
    this.close();
    window.open(url, '_blank');
  }

  /* ─── Search & render ───────────────────────────────────────────────── */
  async _performSearch(query) {
    const resultsContainer = this.shadow.getElementById('at-search-results');
    const pillsContainer = this.shadow.getElementById('at-search-pills');
    if (!resultsContainer) return;

    // Empty query → placeholder
    if (!query) {
      resultsContainer.innerHTML = `<div class="at-search-empty">Start typing to search your AI chats…</div>`;
      if (pillsContainer) pillsContainer.style.display = 'none';
      this.flatResults = [];
      this.selectedIndex = 0;
      return;
    }

    const tier = await getSetting('tier', 'free');
    const maxResults = tier === 'pro' ? 50 : 10;

    const grouped = await searchChats(query, { limit: maxResults });
    this.results = grouped;
    this.flatResults = [];
    this.selectedIndex = 0;
    this.lastQuery = query;

    // Flatten for keyboard navigation (order: chatgpt first, then claude)
    for (const platform of ['chatgpt', 'claude']) {
      if (grouped[platform]) {
        this.flatResults.push(...grouped[platform]);
      }
    }
    // Any other platforms that might appear
    for (const platform of Object.keys(grouped)) {
      if (platform !== 'chatgpt' && platform !== 'claude') {
        this.flatResults.push(...grouped[platform]);
      }
    }

    // ── Platform count pills ────────────────────────────────────────────
    if (pillsContainer) {
      if (this.flatResults.length > 0) {
        pillsContainer.style.display = 'flex';
        pillsContainer.innerHTML = Object.entries(grouped)
          .map(([plat, chats]) => `
            <span class="at-search-pill at-platform-pill-${plat}">
              <span class="at-search-platform-dot at-platform-dot-${plat}"></span>
              ${this._platformName(plat)} <strong>${chats.length}</strong>
            </span>
          `).join('');
      } else {
        pillsContainer.style.display = 'none';
      }
    }

    // ── Empty state ─────────────────────────────────────────────────────
    if (this.flatResults.length === 0) {
      resultsContainer.innerHTML = `
        <div class="at-search-empty">
          No matches found for "<strong>${this._esc(query)}</strong>"
        </div>
      `;
      return;
    }

    // ── Render grouped results ──────────────────────────────────────────
    let html = '';
    for (const [plat, chats] of Object.entries(grouped)) {
      html += `
        <div class="at-search-platform-group">
          <div class="at-search-platform-label">
            <span class="at-search-platform-dot at-platform-dot-${plat}"></span>
            ${this._platformName(plat)}
            <span style="opacity:0.5">(${chats.length})</span>
          </div>
          ${chats.map(chat => {
            const snippet = this._extractSnippet(chat, query);
            return `
            <div class="at-search-result" data-url="${this._esc(chat.url)}" data-id="${this._esc(chat.id)}">
              <span class="at-result-icon">${this._platformIcon(plat)}</span>
              <div class="at-result-info">
                <div class="at-result-title">${this._highlight(chat.title || 'Untitled', query)}</div>
                ${snippet ? `<div class="at-result-snippet">${snippet}</div>` : ''}
                <div class="at-result-meta">${this._formatDate(chat.updatedAt)}</div>
              </div>
              <span class="at-result-arrow">→</span>
            </div>`;
          }).join('')}
        </div>
      `;
    }
    resultsContainer.innerHTML = html;

    // Free tier notice
    if (tier === 'free' && this.flatResults.length >= maxResults) {
      resultsContainer.innerHTML += `
        <div class="at-search-empty" style="padding:10px;font-size:11px;">
          ✨ Upgrade to Pro to see all results
        </div>
      `;
    }

    this._updateSelection();
  }

  /* ─── Snippet extraction ────────────────────────────────────────────── */
  /**
   * Extract a ~120-char snippet from the stored content around the
   * first occurrence of any query term.  Falls back to the first 120
   * chars of content if no term is found directly.
   */
  _extractSnippet(chat, query) {
    const content = chat.content;
    if (!content || typeof content !== 'string' || content.length === 0) return '';

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const contentLower = content.toLowerCase();

    // Find the first term that appears in content
    let matchIndex = -1;
    for (const term of terms) {
      const idx = contentLower.indexOf(term);
      if (idx >= 0) {
        matchIndex = idx;
        break;
      }
    }

    let snippet;
    const SNIPPET_LEN = 120;

    if (matchIndex >= 0) {
      // Center the snippet around the match
      const start = Math.max(0, matchIndex - Math.floor(SNIPPET_LEN / 2));
      const end = Math.min(content.length, start + SNIPPET_LEN);
      snippet = (start > 0 ? '…' : '') + content.slice(start, end).trim() + (end < content.length ? '…' : '');
    } else {
      // Fallback: first 120 chars
      snippet = content.slice(0, SNIPPET_LEN).trim() + (content.length > SNIPPET_LEN ? '…' : '');
    }

    return this._highlight(snippet, query);
  }

  /* ─── Highlight query terms ─────────────────────────────────────────── */
  /**
   * Wraps all occurrences of each query term in
   * <mark class="at-highlight">…</mark>.
   * Escapes HTML first to prevent XSS.
   */
  _highlight(text, query) {
    if (!text || !query) return this._esc(text || '');
    const escaped = this._esc(text);
    const terms = query
      .split(/\s+/)
      .filter(Boolean)
      .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (!terms.length) return escaped;

    const pattern = new RegExp(`(${terms.join('|')})`, 'gi');
    return escaped.replace(pattern, '<mark class="at-highlight">$1</mark>');
  }

  /* ─── Update keyboard selection highlight ───────────────────────────── */
  _updateSelection() {
    const results = this.shadow.querySelectorAll('.at-search-result');
    results.forEach((el, i) => {
      el.classList.toggle('at-selected', i === this.selectedIndex);
      if (i === this.selectedIndex) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  /* ─── Helpers ────────────────────────────────────────────────────────── */
  _platformName(platform) {
    return { chatgpt: 'ChatGPT', claude: 'Claude' }[platform] || platform;
  }

  _platformIcon(platform) {
    return { chatgpt: '🤖', claude: '🧠' }[platform] || '💬';
  }

  _formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
