import { getPrompts, incrementPromptUsage, checkLimit } from '../../db/db.js';

/**
 * Prompt Library — // Slash Trigger
 * Watches the chat input box for "//" and shows a floating prompt picker.
 * Pressing Enter injects the selected prompt into the input.
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
    // Watch for new input elements appearing (SPA navigation)
    const observer = new MutationObserver(() => this._attachToInputs());
    observer.observe(document.body, { childList: true, subtree: true });
    this._attachToInputs();
  }

  _attachToInputs() {
    const selectors = [
      'textarea[placeholder*="message" i]',
      'div[contenteditable="true"][role="textbox"]',
      '#prompt-textarea',
      '[data-testid="composer-input"]',
    ];

    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach(input => {
        if (input._atPromptAttached) return;
        input._atPromptAttached = true;
        this._bindInput(input);
      });
    }
  }

  _bindInput(input) {
    const isContentEditable = input.contentEditable === 'true';

    input.addEventListener('input', (e) => {
      const value = isContentEditable ? input.textContent : input.value;
      const pos = isContentEditable ? this._getCaretPosition(input) : input.selectionStart;
      const textBefore = value.slice(0, pos);
      const slashMatch = textBefore.match(/\/\/(\w*)$/);

      if (slashMatch) {
        this.triggerEl = input;
        this.slashStart = pos - slashMatch[0].length;
        this._openMenu(input, slashMatch[1]);
      } else if (this.isOpen) {
        this.close();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredPrompts.length - 1);
        this._updateSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this._updateSelection();
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        this._injectPrompt(this.filteredPrompts[this.selectedIndex]);
      } else if (e.key === 'Escape') {
        this.close();
      }
    });
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
      left: ${rect.left}px;
      bottom: ${window.innerHeight - rect.top + 8}px;
    `;

    if (this.filteredPrompts.length === 0) {
      menu.innerHTML = `
        <div class="at-prompt-search">
          <span class="at-prompt-search-icon">✨</span>
          <input class="at-prompt-search-input" placeholder="// No prompts yet..." readonly />
        </div>
        <div class="at-search-empty" style="padding:16px;font-size:12px;">
          Save prompts from the extension popup to use them here.
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

    // Filter input
    const filterInput = menu.querySelector('#at-prompt-filter');
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

    // Click to select
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.at-prompt-item');
      if (item) {
        const idx = parseInt(item.dataset.index);
        this.selectedIndex = idx;
        this._injectPrompt(this.filteredPrompts[idx]);
      }
    });

    // Close on outside click
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

    // Handle {{variable}} placeholders
    const vars = [...body.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
    if (vars.length > 0) {
      const filled = await this._fillVariables(vars);
      if (!filled) return; // user cancelled
      for (const [varName, value] of Object.entries(filled)) {
        body = body.replaceAll(`{{${varName}}}`, value);
      }
    }

    // Replace the "//" trigger text with the prompt
    const isContentEditable = this.triggerEl.contentEditable === 'true';
    if (isContentEditable) {
      const text = this.triggerEl.textContent;
      this.triggerEl.textContent = text.slice(0, this.slashStart) + body + text.slice(this.slashStart);
    } else {
      const val = this.triggerEl.value;
      const end = this.triggerEl.selectionStart;
      this.triggerEl.value = val.slice(0, this.slashStart) + body + val.slice(end);
    }

    // Trigger React's synthetic event so the AI platform sees the change
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

  _getCaretPosition(el) {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return 0;
    const range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(el);
    range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
    return range.toString().length;
  }

  _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}
