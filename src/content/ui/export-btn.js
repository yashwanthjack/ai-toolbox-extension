/**
 * Export Button — injected into the AI platform's chat toolbar.
 * Exports current chat as Markdown (.md) or Plain Text (.txt).
 * Uses Turndown for Markdown conversion.
 * 100% local — no server involved.
 */
export class ExportButton {
  constructor(shadowRoot, platform) {
    this.shadow = shadowRoot;
    this.platform = platform;
    this._mounted = false;
    this._watchForToolbar();
  }

  _watchForToolbar() {
    const observer = new MutationObserver(() => this._tryMount());
    observer.observe(document.body, { childList: true, subtree: true });
    this._tryMount();
  }

  _tryMount() {
    if (this._mounted) return;
    const toolbar = this._findToolbar();
    if (!toolbar) return;
    this._mount(toolbar);
  }

  _findToolbar() {
    // ChatGPT toolbar selectors (may change with updates)
    const selectors = [
      '[data-testid="conversation-turn-counter"]',
      'header[data-testid]',
      '.flex.items-center.justify-between.gap-2',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el.parentElement || el;
    }
    return null;
  }

  _mount(toolbar) {
    this._mounted = true;

    // Create a wrapper for our export button (outside shadow DOM so it sits in the page)
    const wrapper = document.createElement('div');
    wrapper.id = 'at-export-wrapper';
    wrapper.style.cssText = 'position:relative; display:inline-block;';

    const btn = document.createElement('button');
    btn.className = 'at-export-btn';
    btn.id = 'at-export-btn';
    btn.innerHTML = `<span>⬇️</span> Export`;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleDropdown(wrapper);
    });

    wrapper.appendChild(btn);
    toolbar.appendChild(wrapper);
  }

  _toggleDropdown(wrapper) {
    const existing = wrapper.querySelector('.at-export-dropdown');
    if (existing) { existing.remove(); return; }

    const dropdown = document.createElement('div');
    dropdown.className = 'at-export-dropdown';
    dropdown.innerHTML = `
      <div class="at-export-option" data-format="md">📝 Markdown (.md)</div>
      <div class="at-export-option" data-format="txt">📄 Plain Text (.txt)</div>
    `;

    dropdown.addEventListener('click', async (e) => {
      const format = e.target.closest('[data-format]')?.dataset.format;
      if (format) {
        dropdown.remove();
        await this._exportChat(format);
      }
    });

    wrapper.appendChild(dropdown);
    document.addEventListener('click', () => dropdown.remove(), { once: true });
  }

  async _exportChat(format) {
    const chatData = this._extractChatFromDOM();
    if (!chatData) {
      alert('Could not find chat content to export. Please try again.');
      return;
    }

    let content, filename, mimeType;

    if (format === 'md') {
      content = this._toMarkdown(chatData);
      filename = `${this._sanitizeFilename(chatData.title)}.md`;
      mimeType = 'text/markdown';
    } else {
      content = this._toPlainText(chatData);
      filename = `${this._sanitizeFilename(chatData.title)}.txt`;
      mimeType = 'text/plain';
    }

    this._download(content, filename, mimeType);
  }

  _extractChatFromDOM() {
    // Try to get title from the page
    const titleEl = document.querySelector(
      'title, h1, [data-testid="conversation-turn"] h1, .font-semibold'
    );
    const title = titleEl?.textContent?.trim() || document.title.replace(' - ChatGPT', '').trim() || 'Chat Export';

    // Extract messages from DOM
    const messages = [];

    if (this.platform === 'chatgpt') {
      // ChatGPT message elements
      const turns = document.querySelectorAll('[data-testid^="conversation-turn-"]');
      turns.forEach(turn => {
        const roleEl = turn.querySelector('[data-message-author-role]');
        const role = roleEl?.dataset.messageAuthorRole || 'unknown';
        const contentEl = turn.querySelector('.markdown, [data-message-content]');
        const content = contentEl?.textContent?.trim() || turn.textContent?.trim();
        if (content) messages.push({ role, content });
      });
    } else if (this.platform === 'claude') {
      // Claude message elements
      const turns = document.querySelectorAll('[data-testid="human-turn"], [data-testid="ai-turn"]');
      turns.forEach(turn => {
        const role = turn.dataset.testid === 'human-turn' ? 'user' : 'assistant';
        const content = turn.textContent?.trim();
        if (content) messages.push({ role, content });
      });
    }

    // Fallback: grab all visible text blocks
    if (messages.length === 0) {
      const blocks = document.querySelectorAll('p, pre, li');
      blocks.forEach(block => {
        const content = block.textContent?.trim();
        if (content && content.length > 10) {
          messages.push({ role: 'unknown', content });
        }
      });
    }

    return { title, messages, platform: this.platform, exportedAt: new Date() };
  }

  _toMarkdown({ title, messages, platform, exportedAt }) {
    const platformName = { chatgpt: 'ChatGPT', claude: 'Claude' }[platform] || platform;
    let md = `# ${title}\n\n`;
    md += `**Platform:** ${platformName}  \n`;
    md += `**Exported:** ${exportedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  \n`;
    md += `**Source:** [AI Toolbox Extension](https://chrome.google.com/webstore)\n\n---\n\n`;

    messages.forEach(({ role, content }) => {
      const roleLabel = role === 'user' ? '## 🧑 You' : role === 'assistant' ? '## 🤖 AI' : `## ${role}`;
      md += `${roleLabel}\n\n${content}\n\n---\n\n`;
    });

    return md;
  }

  _toPlainText({ title, messages, platform, exportedAt }) {
    const platformName = { chatgpt: 'ChatGPT', claude: 'Claude' }[platform] || platform;
    let txt = `${title}\n${'='.repeat(title.length)}\n\n`;
    txt += `Platform: ${platformName}\n`;
    txt += `Exported: ${exportedAt.toLocaleDateString('en-US')}\n\n`;
    txt += `${'─'.repeat(60)}\n\n`;

    messages.forEach(({ role, content }) => {
      const label = role === 'user' ? 'YOU' : role === 'assistant' ? 'AI' : role.toUpperCase();
      txt += `[${label}]\n${content}\n\n${'─'.repeat(60)}\n\n`;
    });

    return txt;
  }

  _download(content, filename, mimeType) {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  _sanitizeFilename(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 100)
      || 'chat_export';
  }
}
