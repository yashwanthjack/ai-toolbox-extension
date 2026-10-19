import {
  getFolders, createFolder, renameFolder, deleteFolder,
  moveChatToFolder, togglePin, getAllChats, checkLimit,
  getChatsInFolder
} from '../../db/db.js';

/**
 * Sidebar — Folder tree + Pinned chats
 * Injected into the AI platform's sidebar via Shadow DOM.
 */
export class SidebarUI {
  constructor(shadowRoot, platform) {
    this.shadow = shadowRoot;
    this.platform = platform;
    this.selectedFolderId = null;
    this.draggedChatId = null;
  }

  async render() {
    const container = this.shadow.getElementById('at-sidebar');
    if (!container) return;

    const [folders, pinnedChats] = await Promise.all([
      getFolders(this.platform),
      getAllChats(this.platform).then(chats => chats.filter(c => c.isPinned)),
    ]);

    container.innerHTML = `
      ${this._renderPinnedSection(pinnedChats)}
      ${this._renderFolderSection(folders)}
    `;

    this._bindEvents();
  }

  _renderPinnedSection(chats) {
    if (!chats.length) return '';
    return `
      <div class="at-pinned-section">
        <div class="at-sidebar-header">
          <span class="at-sidebar-title">📌 Pinned</span>
        </div>
        ${chats.map(c => `
          <a href="${c.url}" class="at-pinned-chat" data-chat-id="${c.id}">
            <span class="at-pinned-chat-icon">💬</span>
            <span class="at-pinned-chat-title">${this._esc(c.title)}</span>
          </a>
        `).join('')}
      </div>
    `;
  }

  _renderFolderSection(folders) {
    return `
      <div class="at-sidebar-header">
        <span class="at-sidebar-title">📁 Folders</span>
        <button class="at-icon-btn" id="at-new-folder-btn" title="New folder">
          ${this._svgPlus()}
        </button>
      </div>
      <ul class="at-folder-list" id="at-folder-list">
        ${folders.length === 0
        ? `<li class="at-empty-state">
               <div class="at-empty-icon">📂</div>
               <div class="at-empty-text">No folders yet.<br>Click + to create one.</div>
             </li>`
        : folders.map(f => this._renderFolder(f)).join('')
      }
      </ul>
    `;
  }

  _renderFolder(folder) {
    return `
      <li class="at-folder-item ${this.selectedFolderId === folder.id ? 'at-active' : ''}"
          data-folder-id="${folder.id}"
          draggable="false">
        <span class="at-folder-icon">📁</span>
        <span class="at-folder-name">${this._esc(folder.name)}</span>
        <div class="at-folder-actions">
          <button class="at-icon-btn at-rename-folder" data-folder-id="${folder.id}" title="Rename">
            ${this._svgPencil()}
          </button>
          <button class="at-icon-btn at-delete-folder" data-folder-id="${folder.id}" title="Delete">
            ${this._svgTrash()}
          </button>
        </div>
      </li>
    `;
  }

  _bindEvents() {
    // New folder button
    const newBtn = this.shadow.getElementById('at-new-folder-btn');
    newBtn?.addEventListener('click', () => this._handleNewFolder());

    // Folder list events
    const folderList = this.shadow.getElementById('at-folder-list');
    if (!folderList) return;

    folderList.addEventListener('click', async (e) => {
      const renameBtn = e.target.closest('.at-rename-folder');
      const deleteBtn = e.target.closest('.at-delete-folder');
      const folderItem = e.target.closest('.at-folder-item');

      if (renameBtn) {
        e.stopPropagation();
        this._handleRename(renameBtn.dataset.folderId);
      } else if (deleteBtn) {
        e.stopPropagation();
        this._handleDelete(deleteBtn.dataset.folderId);
      } else if (folderItem) {
        this._handleFolderSelect(folderItem.dataset.folderId);
      }
    });

    // Right-click context menu on folder items
    folderList.addEventListener('contextmenu', (e) => {
      const folderItem = e.target.closest('.at-folder-item');
      if (folderItem) {
        e.preventDefault();
        this._showContextMenu(e.clientX, e.clientY, folderItem.dataset.folderId);
      }
    });

    // Drag-over folders (to assign chats)
    folderList.querySelectorAll('.at-folder-item').forEach(item => {
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('at-drag-over');
      });
      item.addEventListener('dragleave', () => {
        item.classList.remove('at-drag-over');
      });
      item.addEventListener('drop', async (e) => {
        e.preventDefault();
        item.classList.remove('at-drag-over');
        const chatId = e.dataTransfer.getData('text/at-chat-id');
        const folderId = item.dataset.folderId;
        if (chatId && folderId) {
          await moveChatToFolder(chatId, folderId);
          await this.render();
        }
      });
    });
  }

  async _handleNewFolder() {
    const check = await checkLimit('folders');
    if (!check.allowed) {
      this._showLimitModal('folders', check.limit);
      return;
    }
    const name = await this._inlineInput('New folder name...');
    if (name?.trim()) {
      await createFolder({ name: name.trim(), platform: this.platform });
      await this.render();
    }
  }

  async _handleRename(folderId) {
    const el = this.shadow.querySelector(`[data-folder-id="${folderId}"] .at-folder-name`);
    const currentName = el?.textContent || '';
    const name = await this._inlineInput('Rename folder...', currentName, el);
    if (name?.trim() && name !== currentName) {
      await renameFolder(folderId, name.trim());
      await this.render();
    }
  }

  async _handleDelete(folderId) {
    if (!confirm('Delete this folder? Chats inside will be unassigned.')) return;
    await deleteFolder(folderId);
    if (this.selectedFolderId === folderId) this.selectedFolderId = null;
    await this.render();
  }

  _handleFolderSelect(folderId) {
    this.selectedFolderId = folderId === this.selectedFolderId ? null : folderId;
    this.shadow.querySelectorAll('.at-folder-item').forEach(el => {
      el.classList.toggle('at-active', el.dataset.folderId === this.selectedFolderId);
    });
    // Dispatch so platform modules can filter chat list
    window.dispatchEvent(new CustomEvent('at_folder_selected', {
      detail: { folderId: this.selectedFolderId }
    }));
  }

  _showContextMenu(x, y, folderId) {
    const existing = this.shadow.querySelector('.at-context-menu');
    existing?.remove();

    const menu = document.createElement('div');
    menu.className = 'at-context-menu';
    menu.style.cssText = `left:${x}px; top:${y}px;`;
    menu.innerHTML = `
      <div class="at-context-item" data-action="rename">✏️ Rename</div>
      <div class="at-context-separator"></div>
      <div class="at-context-item at-danger" data-action="delete">🗑️ Delete</div>
    `;

    menu.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      menu.remove();
      if (action === 'rename') this._handleRename(folderId);
      if (action === 'delete') this._handleDelete(folderId);
    });

    this.shadow.appendChild(menu);
    document.addEventListener('click', () => menu.remove(), { once: true });
  }

  _inlineInput(placeholder, defaultValue = '', targetEl = null) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.className = 'at-inline-input';
      input.placeholder = placeholder;
      input.value = defaultValue;

      if (targetEl) {
        targetEl.replaceWith(input);
      } else {
        // FIX: Mount the input at the top of the folder list when creating a new folder!
        const folderList = this.shadow.getElementById('at-folder-list');
        folderList?.prepend(input);
      }

      input.focus();
      input.select();

      let finished = false;
      const done = (commit) => {
        if (finished) return; // Prevent Enter + Blur double trigger
        finished = true;
        const val = input.value;
        if (targetEl) input.replaceWith(targetEl);
        else input.remove();
        resolve(commit ? val : null);
      };

      input.addEventListener('keydown', (e) => {
        e.stopPropagation(); // Stop ChatGPT/Claude from hijacking keystrokes
        if (e.key === 'Enter') { e.preventDefault(); done(true); }
        if (e.key === 'Escape') { e.preventDefault(); done(false); }
      });
      input.addEventListener('blur', () => done(false));
    });
  }

  _showLimitModal(resource, limit) {
    window.dispatchEvent(new CustomEvent('at_show_upgrade', {
      detail: { reason: `You've reached the free limit of ${limit} ${resource}.` }
    }));
  }

  _esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _svgPlus() {
    return `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/></svg>`;
  }
  _svgPencil() {
    return `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-2.207 2.207L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>`;
  }
  _svgTrash() {
    return `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`;
  }
}
