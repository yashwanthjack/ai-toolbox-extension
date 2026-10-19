import { getPrompts, incrementPromptUsage, checkLimit } from '../../db/db.js';

/**
 * Prompt Library — // Slash Trigger
 * Watches the active chat box for "//" using a global document keyup listener
 * to bypass React event handling inside contenteditable elements.
 */
export class PromptMenu {
  constructor(shadowRoot, platform) {
    this.shadow = shadowRoot;
    this.platform = platform;
    this.isOpen = false;
    this.selectedIndex = 0;
    this.prompts = [];
    this.filteredPrompts = [];
    this.triggerEl = null;
    this.slashStart = -1;
    this._watchInputs();
  }

  _watchInputs() {
    // Global keyup listener on the entire document to catch every keystroke
    document.addEventListener('keyup', (e) => {
      const activeEl = document.activeElement;
      if (!activeEl) return;

      const isInput =
        activeEl.id === 'prompt-textarea' ||
        activeEl.getAttribute('contenteditable') === 'true' ||
        activeEl.tagName === 'TEXTAREA';

      if (!isInput) return;

      const text = activeEl.contentEditable === 'true'
        ? (activeEl.innerText || activeEl.textContent || '')
        : (activeEl.value || '');

      const slashMatch = text.match(/\/\/(\w*)$/);

      if (slashMatch) {
        this.triggerEl = activeEl;
        this.slashStart = text.length - slashMatch[0].length;
        if (!this.isOpen) {
          this._openMenu(activeEl, slashMatch[1]);
        }
      } else if (this.isOpen && !text.includes('//')) {
        this.close();
      }
    });
  }

  _bindInput(input) {
    // Handled globally by document keyup listener above
  }

  async _openMenu(inputEl, filter) {
    this.isOpen = true;
    this.prompts = await getPrompts();
    this._filterPrompts(filter);
    this.selectedIndex = 0;
    this._renderMenu(inputEl);
  }

  _filterPrompts(query) {
    const q = query.toLowerCase();
    this.filteredPrompts = q
      ? this.prompts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q)
      )
      : this.prompts;
  }

  _renderMenu(inputEl) {
    this._removeMenu();

    const rect = inputEl.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'at-prompt-menu';
    menu.id = 'at-prompt-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${Math.max(20, rect.left)}px;
      bottom: ${window.innerHeight - rect.top + 16}px;
      z-index: 999998;
    `;

    if (this.filteredPrompts.length === 0) {
      menu.innerHTML = `
        <div class="at-prompt-search">
          <span class="at-prompt-search-icon">✨</span>
          <input class="at-prompt-search-input" placeholder="// No prompts saved yet..." readonly />
        </div>
        <div class="at-search-empty" style="padding:16px;font-size:12px;color:#8888a0;">
          Add prompts in your extension popup first!
        </div>
      `;
    } else {
      menu.innerHTML = `
        <div class="at-prompt-search">
          <span class="at-prompt-search-icon">✨</span>
          <input class="at-prompt-search-input" id="at-prompt-filter" placeholder="Filter prompts..." />
        </div>
        <div class="at-prompt-list" id="at-prompt-list">
          ${this.filteredPrompts.map((p, i) => `
            <div class="at-prompt-item ${i === 0 ? 'at-selected' : ''}" data-index="${i}">
              <div class="at-prompt-title">${this._esc(p.title)}</div>
              <div class="at-prompt-preview">${this._esc(p.body.slice(0, 60))}${p.body.length > 60 ? '…' : ''}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    this.shadow.appendChild(menu);

    const filterInput = menu.querySelector('#at-prompt-filter');
    filterInput?.focus();

    menu.addEventListener('mousedown', (e) => e.stopPropagation());

    filterInput?.addEventListener('input', (e) => {
      this._filterPrompts(e.target.value);
      const list = menu.querySelector('#at-prompt-list');
      if (list) {
        list.innerHTML = this.filteredPrompts.map((p, i) => `
          <div class="at-prompt-item ${i === 0 ? 'at-selected' : ''}" data-index="${i}">
            <div class="at-prompt-title">${this._esc(p.title)}</div>
            <div class="at-prompt-preview">${this._esc(p.body.slice(0, 60))}${p.body.length > 60 ? '…' : ''}</div>
          </div>
        `).join('');
        this.selectedIndex = 0;
      }
    });

    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.at-prompt-item');
      if (item) {
        const idx = parseInt(item.dataset.index);
        this.selectedIndex = idx;
        this._injectPrompt(this.filteredPrompts[idx]);
      }
    });

    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== inputEl) {
          this.close();
        }
      }, { once: true });
    }, 100);
  }

  async _injectPrompt(prompt) {
    if (!prompt || !this.triggerEl) return;
    this.close();

    let body = prompt.body;
    const vars = [...body.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
    if (vars.length > 0) {
      const filled = await this._fillVariables(vars);
      if (!filled) return;
      for (const [varName, value] of Object.entries(filled)) {
        body = body.replaceAll(`{{${varName}}}`, value);
      }
    }

    const isContentEditable = this.triggerEl.contentEditable === 'true';
    if (isContentEditable) {
      const text = this.triggerEl.textContent || '';
      this.triggerEl.textContent = text.slice(0, this.slashStart) + body + text.slice(this.slashStart);
    } else {
      const val = this.triggerEl.value || '';
      const end = this.triggerEl.selectionStart || val.length;
      this.triggerEl.value = val.slice(0, this.slashStart) + body + val.slice(end);
    }

    this.triggerEl.dispatchEvent(new Event('input', { bubbles: true }));
    this.triggerEl.focus();

    await incrementPromptUsage(prompt.id);
  }

  _fillVariables(varNames) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'at-var-dialog';
      dialog.innerHTML = `
        <div class="at-var-dialog-box">
          <div class="at-var-dialog-title">Fill in variables</div>
          ${varNames.map(v => `
            <div class="at-var-dialog-label">{{${v}}}</div>
            <input class="at-var-dialog-input" data-var="${v}" placeholder="Enter value for ${v}..." />
          `).join('')}
          <div class="at-var-dialog-actions">
            <button class="at-btn at-btn-ghost" id="at-var-cancel">Cancel</button>
            <button class="at-btn at-btn-primary" id="at-var-confirm">Insert Prompt</button>
          </div>
        </div>
      `;

      this.shadow.appendChild(dialog);
      dialog.querySelector('.at-var-dialog-input')?.focus();

      const done = (commit) => {
        dialog.remove();
        if (!commit) { resolve(null); return; }
        const result = {};
        dialog.querySelectorAll('[data-var]').forEach(el => {
          result[el.dataset.var] = el.value;
        });
        resolve(result);
      };

      dialog.querySelector('#at-var-confirm')?.addEventListener('click', () => done(true));
      dialog.querySelector('#at-var-cancel')?.addEventListener('click', () => done(false));
      dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') done(true);
        if (e.key === 'Escape') done(false);
      });
    });
  }

  _updateSelection() {
    this.shadow.querySelectorAll('.at-prompt-item').forEach((el, i) => {
      el.classList.toggle('at-selected', i === this.selectedIndex);
      if (i === this.selectedIndex) el.scrollIntoView({ block: 'nearest' });
    });
  }

  close() {
    this.isOpen = false;
    this._removeMenu();
  }

  _removeMenu() {
    this.shadow.getElementById('at-prompt-menu')?.remove();
  }

  _esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}