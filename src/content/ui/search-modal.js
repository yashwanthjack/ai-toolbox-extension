import { searchChats, initSearchIndex } from '../../db/search-index.js';
import { getSetting } from '../../db/db.js';

/**
 * Cmd+K Global Search Modal
 * Opens as an overlay on any ChatGPT/Claude page.
 * Searches local MiniSearch index across both platforms.
 */
export class SearchModal {
  constructor(shadowRoot) {
    this.shadow = shadowRoot;
    this.isOpen = false;
    this.selectedIndex = 0;
    this.results = [];
    this.flatResults = [];
    this.debounceTimer = null;
    this._setupKeyboardShortcut();
  }

  _setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.includes('Mac');
      const trigger = isMac
        ? (e.metaKey && e.shiftKey && e.key === '.')
        : (e.ctrlKey && e.shiftKey && e.key === '.');

      if (trigger) {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Listen for message from service worker (keyboard command)
    chrome.runtime?.onMessage?.addListener((msg) => {
      if (msg.type === 'OPEN_SEARCH') this.open();
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  async open() {
    if (this.isOpen) return;
    this.isOpen = true;

    // Ensure index is initialized
    await initSearchIndex();

    const overlay = document.createElement('div');
    overlay.className = 'at-search-overlay';
    overlay.id = 'at-search-overlay';
    overlay.innerHTML = this._renderModal();
    this.shadow.appendChild(overlay);

    const input = this.shadow.getElementById('at-search-input');
    input?.focus();

    this._bindModalEvents(overlay);
  }

  close() {
    this.isOpen = false;
    this.selectedIndex = 0;
    this.results = [];
    this.flatResults = [];
    const overlay = this.shadow.getElementById('at-search-overlay');
    overlay?.remove();
  }

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
        <div class="at-search-results" id="at-search-results">
          <div class="at-search-empty" id="at-search-placeholder">
            Start typing to search your AI chats...
          </div>
        </div>
        <div class="at-search-footer">
          <span><span class="at-kbd">↑↓</span> Navigate</span>
          <span><span class="at-kbd">↵</span> Open chat</span>
          <span><span class="at-kbd">Esc</span> Close</span>
        </div>
      </div>
    `;
  }

  _bindModalEvents(overlay) {
    const input = this.shadow.getElementById('at-search-input');
    const resultsContainer = this.shadow.getElementById('at-search-results');

    // Close on overlay click (outside modal)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Search input
    input?.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this._performSearch(e.target.value.trim());
      }, 150);
    });

    // Keyboard navigation
    input?.addEventListener('keydown', async (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.flatResults.length - 1);
        this._updateSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this._updateSelection();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = this.flatResults[this.selectedIndex];
        if (selected?.url) {
          window.open(selected.url, '_self');
          this.close();
        }
      }
    });

    // Click results
    resultsContainer?.addEventListener('click', (e) => {
      const resultEl = e.target.closest('.at-search-result');
      if (resultEl?.dataset.url) {
        window.open(resultEl.dataset.url, '_self');
        this.close();
      }
    });
  }

  async _performSearch(query) {
    const resultsContainer = this.shadow.getElementById('at-search-results');
    if (!resultsContainer) return;

    if (!query) {
      resultsContainer.innerHTML = `<div class="at-search-empty">Start typing to search your AI chats...</div>`;
      this.flatResults = [];
      return;
    }

    const tier = await getSetting('tier', 'free');
    const maxResults = tier === 'pro' ? 50 : 5;

    const grouped = await searchChats(query, { limit: maxResults });
    this.results = grouped;
    this.flatResults = [];
    this.selectedIndex = 0;

    // Flatten for keyboard nav
    for (const platform of Object.keys(grouped)) {
      this.flatResults.push(...grouped[platform]);
    }

    if (this.flatResults.length === 0) {
      resultsContainer.innerHTML = `
        <div class="at-search-empty">
          No chats found for "<strong>${this._esc(query)}</strong>"<br>
          <small style="font-size:11px;margin-top:6px;display:block;color:var(--at-text-faint)">
            Browse a chat on ChatGPT or Claude to index it.
          </small>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = Object.entries(grouped).map(([platform, chats]) => `
      <div class="at-search-platform-group">
        <div class="at-search-platform-label">
          <span class="at-search-platform-dot at-platform-dot-${platform}"></span>
          ${this._platformName(platform)}
          <span>(${chats.length})</span>
        </div>
        ${chats.map(chat => `
          <div class="at-search-result" data-url="${this._esc(chat.url)}" data-id="${chat.id}">
            <span class="at-result-icon">${platform === 'chatgpt' ? '🤖' : '🧠'}</span>
            <div class="at-result-info">
              <div class="at-result-title">${this._esc(chat.title)}</div>
              <div class="at-result-meta">${this._formatDate(chat.updatedAt)}</div>
            </div>
            <span class="at-result-arrow">→</span>
          </div>
        `).join('')}
      </div>
    `).join('');

    // Free tier notice
    if (tier === 'free' && this.flatResults.length >= 5) {
      resultsContainer.innerHTML += `
        <div class="at-search-empty" style="padding:10px;font-size:11px;">
          ✨ Upgrade to Pro to see all results
        </div>
      `;
    }

    this._updateSelection();
  }

  _updateSelection() {
    const results = this.shadow.querySelectorAll('.at-search-result');
    results.forEach((el, i) => {
      el.classList.toggle('at-selected', i === this.selectedIndex);
      if (i === this.selectedIndex) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  _platformName(platform) {
    return { chatgpt: 'ChatGPT', claude: 'Claude' }[platform] || platform;
  }

  _formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}
