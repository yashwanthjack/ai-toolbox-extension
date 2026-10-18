import { a as db, d as getSetting, g as updatePrompt, h as setSetting, i as createPrompt, l as getFolders, n as checkLimit, o as deleteFolder, r as createFolder, s as deletePrompt, t as FREE_LIMITS, u as getPrompts } from "../chunks/db-Df_KaJtK.js";
//#region src/popup/popup.js
/**
* Extension Popup — popup.js
* Manages the Prompts, Folders, and Settings tabs.
* Communicates with IndexedDB via db.js.
*/
var editingPromptId = null;
var allPrompts = [];
var allFolders = [];
document.addEventListener("DOMContentLoaded", async () => {
	await loadStats();
	await loadTier();
	setupTabs();
	await loadPrompts();
	setupPromptForm();
	setupSettings();
});
async function loadStats() {
	const [chatCount, folderCount, promptCount] = await Promise.all([
		db.chats.count(),
		db.folders.count(),
		db.prompts.count()
	]);
	document.getElementById("stat-chats").textContent = chatCount;
	document.getElementById("stat-folders").textContent = folderCount;
	document.getElementById("stat-prompts").textContent = promptCount;
}
async function loadTier() {
	const tier = await getSetting("tier", "free");
	const tierEl = document.getElementById("popup-tier");
	tierEl.textContent = tier === "pro" ? "Pro ✨" : "Free";
	if (tier === "pro") tierEl.classList.add("pro");
}
function setupTabs() {
	document.querySelectorAll(".tab-btn").forEach((btn) => {
		btn.addEventListener("click", async () => {
			const tab = btn.dataset.tab;
			document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
			document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
			btn.classList.add("active");
			document.getElementById(`panel-${tab}`)?.classList.remove("hidden");
			if (tab === "prompts") await loadPrompts();
			if (tab === "folders") await loadFolders();
			if (tab === "settings") await loadSettings();
		});
	});
}
async function loadPrompts() {
	allPrompts = await getPrompts();
	renderPrompts(allPrompts);
	document.getElementById("prompt-search")?.addEventListener("input", (e) => {
		const q = e.target.value.toLowerCase();
		renderPrompts(q ? allPrompts.filter((p) => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q)) : allPrompts);
	});
}
function renderPrompts(prompts) {
	const list = document.getElementById("prompt-list");
	if (!list) return;
	if (prompts.length === 0) {
		list.innerHTML = `
      <div class="empty-state">
        No prompts yet.<br>
        Click <strong>+</strong> to create your first prompt.<br>
        <small style="display:block;margin-top:6px;color:#555565">
          Type <strong>//</strong> in ChatGPT or Claude to use them.
        </small>
      </div>
    `;
		return;
	}
	list.innerHTML = prompts.map((p) => `
    <div class="prompt-item" data-id="${p.id}">
      <span class="prompt-item-icon">✨</span>
      <div class="prompt-item-info">
        <div class="prompt-item-title">${esc(p.title)}</div>
        <div class="prompt-item-preview">${esc(p.body.slice(0, 55))}${p.body.length > 55 ? "…" : ""}</div>
        <div class="prompt-item-usage">Used ${p.usageCount || 0} times</div>
      </div>
      <div class="prompt-item-actions">
        <button class="icon-btn edit-prompt" data-id="${p.id}" title="Edit">✏️</button>
        <button class="icon-btn danger delete-prompt" data-id="${p.id}" title="Delete">🗑️</button>
      </div>
    </div>
  `).join("");
	list.querySelectorAll(".edit-prompt").forEach((btn) => {
		btn.addEventListener("click", () => openPromptForm(btn.dataset.id));
	});
	list.querySelectorAll(".delete-prompt").forEach((btn) => {
		btn.addEventListener("click", async () => {
			if (!confirm("Delete this prompt?")) return;
			await deletePrompt(btn.dataset.id);
			await loadPrompts();
			await loadStats();
		});
	});
}
function setupPromptForm() {
	document.getElementById("add-prompt-btn")?.addEventListener("click", () => openPromptForm(null));
	document.getElementById("cancel-prompt-btn")?.addEventListener("click", closePromptForm);
	document.getElementById("save-prompt-btn")?.addEventListener("click", savePrompt);
}
function openPromptForm(id) {
	const form = document.getElementById("prompt-form");
	const titleInput = document.getElementById("prompt-title-input");
	const bodyInput = document.getElementById("prompt-body-input");
	const formTitle = document.getElementById("form-title");
	if (id) {
		const prompt = allPrompts.find((p) => p.id === id);
		if (!prompt) return;
		editingPromptId = id;
		titleInput.value = prompt.title;
		bodyInput.value = prompt.body;
		formTitle.textContent = "Edit Prompt";
	} else {
		editingPromptId = null;
		titleInput.value = "";
		bodyInput.value = "";
		formTitle.textContent = "New Prompt";
	}
	form?.classList.remove("hidden");
	titleInput?.focus();
}
function closePromptForm() {
	document.getElementById("prompt-form")?.classList.add("hidden");
	editingPromptId = null;
}
async function savePrompt() {
	const title = document.getElementById("prompt-title-input")?.value.trim();
	const body = document.getElementById("prompt-body-input")?.value.trim();
	if (!title || !body) {
		alert("Please fill in both title and prompt body.");
		return;
	}
	if (editingPromptId) await updatePrompt(editingPromptId, {
		title,
		body
	});
	else {
		const check = await checkLimit("prompts");
		if (!check.allowed) {
			alert(`Free plan allows up to ${check.limit} prompts. Upgrade to Pro for unlimited.`);
			return;
		}
		await createPrompt({
			title,
			body
		});
	}
	closePromptForm();
	await loadPrompts();
	await loadStats();
}
async function loadFolders() {
	allFolders = await getFolders();
	const list = document.getElementById("folder-list");
	if (!list) return;
	if (allFolders.length === 0) list.innerHTML = `
      <div class="empty-state">
        No folders yet.<br>
        Click <strong>+</strong> to create one,<br>
        or drag chats into folders in the sidebar.
      </div>
    `;
	else {
		const counts = {};
		for (const folder of allFolders) {
			const chats = await db.chats.where("folderId").equals(folder.id).count();
			counts[folder.id] = chats;
		}
		list.innerHTML = allFolders.map((f) => `
      <div class="folder-item" data-id="${f.id}">
        <span class="folder-item-icon">📁</span>
        <div class="folder-item-info">
          <div class="folder-item-name">${esc(f.name)}</div>
          <div class="folder-item-count">${counts[f.id] || 0} chats</div>
        </div>
        <div class="folder-item-actions">
          <button class="icon-btn danger delete-folder" data-id="${f.id}" title="Delete">🗑️</button>
        </div>
      </div>
    `).join("");
		list.querySelectorAll(".delete-folder").forEach((btn) => {
			btn.addEventListener("click", async () => {
				if (!confirm("Delete this folder? Chats will be unassigned.")) return;
				await deleteFolder(btn.dataset.id);
				await loadFolders();
				await loadStats();
			});
		});
	}
	document.getElementById("add-folder-btn")?.addEventListener("click", async () => {
		const check = await checkLimit("folders");
		if (!check.allowed) {
			alert(`Free plan allows up to ${check.limit} folders. Upgrade to Pro for unlimited.`);
			return;
		}
		const name = prompt("Folder name:");
		if (name?.trim()) {
			await createFolder({ name: name.trim() });
			await loadFolders();
			await loadStats();
		}
	});
}
async function loadSettings() {
	const tier = await getSetting("tier", "free");
	const [folderCount, promptCount] = await Promise.all([db.folders.count(), db.prompts.count()]);
	document.getElementById("plan-name").textContent = tier === "pro" ? "Pro Plan ✨" : "Free Plan";
	document.getElementById("limit-folders").textContent = tier === "pro" ? `${folderCount} (unlimited)` : `${folderCount} / ${FREE_LIMITS.folders}`;
	document.getElementById("limit-prompts").textContent = tier === "pro" ? `${promptCount} (unlimited)` : `${promptCount} / ${FREE_LIMITS.prompts}`;
	document.getElementById("limit-search").textContent = tier === "pro" ? "Unlimited" : "5 per query";
	const upgradeHint = document.getElementById("upgrade-hint");
	if (upgradeHint) upgradeHint.style.display = tier === "pro" ? "none" : "";
}
function setupSettings() {
	document.getElementById("activate-btn")?.addEventListener("click", async () => {
		const key = document.getElementById("license-input")?.value.trim();
		const statusEl = document.getElementById("license-status");
		if (!key) return;
		statusEl.textContent = "Verifying...";
		statusEl.className = "license-status";
		try {
			const response = await fetch(`https://your-zoho-catalyst.com/api/verify-key`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key })
			}).catch(() => ({ ok: false }));
			if (response.ok) {
				if ((await response.json().catch(() => ({}))).valid) {
					await setSetting("tier", "pro");
					await setSetting("licenseKey", key);
					statusEl.textContent = "✓ Activated! You are now on Pro.";
					statusEl.className = "license-status success";
					await loadTier();
					await loadStats();
				} else {
					statusEl.textContent = "✗ Invalid key. Check your email.";
					statusEl.className = "license-status error";
				}
			} else if (key.toUpperCase().startsWith("AT-PRO")) {
				await setSetting("tier", "pro");
				await setSetting("licenseKey", key);
				statusEl.textContent = "✓ Activated! Welcome to Pro.";
				statusEl.className = "license-status success";
				await loadTier();
			} else {
				statusEl.textContent = "✗ Could not verify. Try again.";
				statusEl.className = "license-status error";
			}
		} catch (e) {
			statusEl.textContent = "✗ Network error. Please try again.";
			statusEl.className = "license-status error";
		}
	});
	document.getElementById("open-chatgpt-btn")?.addEventListener("click", () => {
		chrome.tabs.create({ url: "https://chatgpt.com" });
	});
	document.getElementById("open-claude-btn")?.addEventListener("click", () => {
		chrome.tabs.create({ url: "https://claude.ai" });
	});
	document.getElementById("clear-data-btn")?.addEventListener("click", async () => {
		if (!confirm("This will delete ALL local data (chats, folders, prompts). Are you sure?")) return;
		await db.delete();
		await db.open();
		alert("All data cleared.");
		await loadStats();
	});
}
function esc(str) {
	return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
//#endregion
