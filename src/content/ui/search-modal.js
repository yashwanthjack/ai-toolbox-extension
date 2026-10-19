import { searchChats, initSearchIndex } from '../../db/search-index.js';
import { getSetting } from '../../db/db.js';
// Import the raw CSS so we can inject it into the new document.body portal
import shadowCSS from '../../styles/shadow.css?inline';

/**
 * Cmd+K / Ctrl+Shift+F Global Search Modal
 * Implements a document.body Portal to escape ChatGPT's sidebar CSS constraints.
 */
export class SearchModal {
  constructor() {
    this.isOpen = false;
    this.selectedIndex = 0;
    this.results = {};
    this.flatResults = [];
    this.debounceTimer = null;
    this._setupKeyboardShortcut();
  }

  _setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const isTrigger =
        (mod && e.shiftKey && (e.key === '.' || e.key === '>' || e.key.toLowerCase() === 'f')) ||
        (e.altKey && e.key.toLowerCase() === 'k');

      if (isTrigger) {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      }
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    chrome.runtime?.onMessage?.addListener((msg) => {
      if (msg.type === 'OPEN_SEARCH') this.open();
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  // Creates an isolated Shadow DOM directly on document.body so it isn't trapped in the sidebar
  _getPortalShadow() {
    let portalHost = document.getElementById('at-search-portal-root');
    if (!portalHost) {
      portalHost = document.createElement('div');
      portalHost.id = 'at-search-portal-root';
      document.body.appendChild(portalHost);

      const shadow = portalHost.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = shadowCSS;
      shadow.appendChild(style);
    }
    return document.getElementById('at-search-portal-root').shadowRoot;
  }

  async open() {
    if (this.isOpen) return;
    this.isOpen = true;

    await initSearchIndex();

    const portalShadow = this._getPortalShadow();
    portalShadow.getElementById('at-search-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'at-search-overlay';
    overlay.id = 'at-search-overlay';

    overlay.addEventListener('keydown', (e) => e.stopPropagation());
    overlay.addEventListener('keyup', (e) => e.stopPropagation());

    overlay.innerHTML = this._renderModal();
    portalShadow.appendChild(overlay);

    const input = portalShadow.getElementById('at-search-input');
    input?.focus();

    this._bindModalEvents(overlay, portalShadow);
  }

  close() {
    this.isOpen = false;
    this.selectedIndex = 0;
    this.results = {};
    this.flatResults = [];

    const portalShadow = document.getElementById('at-search-portal-root')?.shadowRoot;
    if (portalShadow) {
      portalShadow.getElementById('at-search-overlay')?.remove();
    }
  }

  _renderModal() {
    return `
      <div class="at-search-modal" role="dialog" aria-label="AI Toolbox Search">
        <div class="at-search-header">
          <input
            class="at-search-input"
            id="at-search-input"
            type="text"
            placeholder="Search all platforms..."
            autocomplete="off"
            spellcheck="false"
          />
          <button class="at-search-close" id="at-search-close-btn">✕</button>
        </div>
        <div id="at-platform-pills" class="at-platform-pills"></div>
        <div class="at-search-results" id="at-search-results">
          <div class="at-search-empty" id="at-search-placeholder">
            Start typing to search across ChatGPT, Claude, Gemini, and Grok...
          </div>
        </div>
      </div>
    `;
  }

  _bindModalEvents(overlay, portalShadow) {
    const input = portalShadow.getElementById('at-search-input');
    const resultsContainer = portalShadow.getElementById('at-search-results');
    const closeBtn = portalShadow.getElementById('at-search-close-btn');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    closeBtn?.addEventListener('click', () => this.close());

    input?.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      const query = e.target.value.trim();
      this.debounceTimer = setTimeout(() => {
        this._performSearch(query, portalShadow);
      }, 150);
    });

    input?.addEventListener('keydown', async (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.flatResults.length - 1);
        this._updateSelection(portalShadow);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this._updateSelection(portalShadow);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = this.flatResults[this.selectedIndex];
        if (selected?.url) {
          window.open(selected.url, '_blank');
          this.close();
        }
      }
    });

    resultsContainer?.addEventListener('click', (e) => {
      const resultEl = e.target.closest('.at-search-result');
      if (resultEl?.dataset.url) {
        window.open(resultEl.dataset.url, '_blank');
        this.close();
      }
    });
  }

  async _performSearch(query, portalShadow) {
    const resultsContainer = portalShadow.getElementById('at-search-results');
    const pillsContainer = portalShadow.getElementById('at-platform-pills');
    if (!resultsContainer) return;

    if (!query) {
      resultsContainer.innerHTML = `<div class="at-search-empty">Start typing to search across ChatGPT, Claude, Gemini, and Grok...</div>`;
      if (pillsContainer) pillsContainer.innerHTML = '';
      this.flatResults = [];
      return;
    }

    const tier = await getSetting('tier', 'free');
    const maxResults = tier === 'pro' ? 50 : 10;

    const grouped = await searchChats(query, { limit: maxResults });
    this.results = grouped;
    this.flatResults = [];
    this.selectedIndex = 0;

    for (const platform of Object.keys(grouped)) {
      this.flatResults.push(...grouped[platform]);
    }

    if (pillsContainer) {
      pillsContainer.innerHTML = Object.entries(grouped).map(([platform, chats]) => `
        <span class="at-pill">
          <span class="at-search-platform-dot at-platform-dot-${platform}"></span>
          ${this._platformName(platform)} ${chats.length}
        </span>
      `).join('');
    }

    if (this.flatResults.length === 0) {
      resultsContainer.innerHTML = `
        <div class="at-search-empty">
          No matches found for "<strong>${this._esc(query)}</strong>"
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = Object.entries(grouped).map(([platform, chats]) => `
      <div class="at-search-platform-group">
        <div class="at-search-platform-label">
          <span class="at-search-platform-dot at-platform-dot-${platform}"></span>
          ${this._platformName(platform)} <span class="at-match-count">${chats.length} matches</span>
        </div>
        ${chats.map(chat => `
          <div class="at-search-result ${this.flatResults[this.selectedIndex]?.id === chat.id ? 'at-selected' : ''}" 
               data-url="${this._esc(chat.url)}" data-id="${chat.id}">
            <div class="at-result-top">
              <div class="at-result-title">${this._highlight(chat.title, query)}</div>
              <div class="at-result-date">${this._formatDate(chat.updatedAt)}</div>
            </div>
            <div class="at-result-snippet">${this._highlight(chat.content ? chat.content.slice(0, 120) + '...' : '', query)}</div>
          </div>
        `).join('')}
      </div>
    `).join('');

    this._updateSelection(portalShadow);
  }

  _highlight(text, query) {
    if (!text || !query) return this._esc(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return this._esc(text).replace(regex, '<mark class="at-highlight">$1</mark>');
  }

  _updateSelection(portalShadow) {
    const results = portalShadow.querySelectorAll('.at-search-result');
    results.forEach((el, i) => {
      el.classList.toggle('at-selected', i === this.selectedIndex);
      if (i === this.selectedIndex) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  _platformName(platform) {
    return { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini', grok: 'Grok' }[platform] || platform;
  }

  _formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  }

  _esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}