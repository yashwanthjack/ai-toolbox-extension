(function() {
	//#region src/content/main-world.js
	/**
	* MAIN World Network Interceptor
	* Injected at document_start with world: "MAIN"
	* 
	* Patches window.fetch to intercept AI platform API responses,
	* extract chat data, and dispatch it to the ISOLATED content script.
	*/
	(function patchFetch() {
		const originalFetch = window.fetch;
		let authToken = null;
		let hasStartedSync = false;
		window.fetch = async function(...args) {
			try {
				if (args[1] && args[1].headers) {
					const headers = new Headers(args[1].headers);
					if (headers.has("Authorization")) authToken = headers.get("Authorization");
				} else if (args[0] && typeof args[0] === "object" && args[0].headers) {
					const headers = new Headers(args[0].headers);
					if (headers.has("Authorization")) authToken = headers.get("Authorization");
				}
			} catch (e) {}
			const response = await originalFetch.apply(this, args);
			try {
				let url = "";
				if (typeof args[0] === "string") url = args[0];
				else if (args[0] && typeof args[0] === "object" && typeof args[0].url === "string") url = args[0].url;
				if (!url) return response;
				if (url.includes("chatgpt.com/backend-api/conversations")) response.clone().json().then((data) => {
					if (data?.items) {
						data.items.forEach((item) => {
							dispatchChatEvent({
								id: `chatgpt_${item.id}`,
								platform: "chatgpt",
								title: item.title || "Untitled",
								url: `https://chatgpt.com/c/${item.id}`,
								messages: null,
								createdAt: item.create_time ? /* @__PURE__ */ new Date(item.create_time * 1e3) : /* @__PURE__ */ new Date(),
								updatedAt: item.update_time ? /* @__PURE__ */ new Date(item.update_time * 1e3) : /* @__PURE__ */ new Date()
							});
						});
						if (!hasStartedSync && authToken) {
							hasStartedSync = true;
							autoSyncChatGPT(authToken);
						}
					}
				}).catch(() => {});
				else if (url.includes("chatgpt.com/backend-api/conversation") && !url.includes("gen_title")) handleChatGPTStream(response.clone(), url).catch(console.error);
				if (url.includes("claude.ai/api/organizations") && url.includes("conversations") && !url.includes("/messages")) response.clone().json().then((data) => {
					(Array.isArray(data) ? data : data?.conversations || []).forEach((convo) => {
						dispatchChatEvent({
							id: `claude_${convo.uuid}`,
							platform: "claude",
							title: convo.name || "Untitled",
							url: `https://claude.ai/chat/${convo.uuid}`,
							messages: null,
							createdAt: convo.created_at ? new Date(convo.created_at) : /* @__PURE__ */ new Date(),
							updatedAt: convo.updated_at ? new Date(convo.updated_at) : /* @__PURE__ */ new Date()
						});
					});
				}).catch(() => {});
				else if (url.includes("claude.ai/api/organizations") && url.includes("/conversations/") && !url.includes("/messages")) response.clone().json().then((data) => {
					if (data?.uuid) {
						const messages = (data.chat_messages || []).map((m) => ({
							role: m.sender === "human" ? "user" : "assistant",
							content: extractClaudeContent(m.content),
							timestamp: m.created_at
						}));
						dispatchChatEvent({
							id: `claude_${data.uuid}`,
							platform: "claude",
							title: data.name || "Untitled",
							url: `https://claude.ai/chat/${data.uuid}`,
							messages,
							createdAt: data.created_at ? new Date(data.created_at) : /* @__PURE__ */ new Date(),
							updatedAt: data.updated_at ? new Date(data.updated_at) : /* @__PURE__ */ new Date()
						});
					}
				}).catch(() => {});
			} catch (e) {}
			return response;
		};
		async function autoSyncChatGPT(token) {
			console.log("[AI Toolbox] Starting silent background sync for older chats...");
			let offset = 28;
			let hasMore = true;
			let totalSynced = 0;
			while (hasMore && offset < 3e3) {
				try {
					const res = await originalFetch(`https://chatgpt.com/backend-api/conversations?offset=${offset}&limit=100`, { headers: {
						"Authorization": token,
						"Content-Type": "application/json"
					} });
					if (!res.ok) break;
					const data = await res.json();
					if (data && data.items && data.items.length > 0) {
						data.items.forEach((item) => {
							dispatchChatEvent({
								id: `chatgpt_${item.id}`,
								platform: "chatgpt",
								title: item.title || "Untitled",
								url: `https://chatgpt.com/c/${item.id}`,
								messages: null,
								createdAt: item.create_time ? /* @__PURE__ */ new Date(item.create_time * 1e3) : /* @__PURE__ */ new Date(),
								updatedAt: item.update_time ? /* @__PURE__ */ new Date(item.update_time * 1e3) : /* @__PURE__ */ new Date()
							});
						});
						totalSynced += data.items.length;
						offset += 100;
						if (data.items.length < 100) hasMore = false;
					} else hasMore = false;
				} catch (e) {
					hasMore = false;
				}
				await new Promise((resolve) => setTimeout(resolve, 1500));
			}
			console.log(`[AI Toolbox] Background sync complete. Grabbed ${totalSynced} older chats!`);
		}
		async function handleChatGPTStream(response, url) {
			const reader = response.body?.getReader();
			if (!reader) return;
			const decoder = new TextDecoder();
			let buffer = "";
			const messages = [];
			let chatId = "";
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";
				for (const line of lines) {
					if (!line.startsWith("data: ")) continue;
					const raw = line.slice(6).trim();
					if (raw === "[DONE]") continue;
					try {
						const json = JSON.parse(raw);
						if (json.conversation_id) chatId = json.conversation_id;
						if (json.message?.content?.parts) {
							const role = json.message.author?.role || "assistant";
							const content = json.message.content.parts.filter((p) => typeof p === "string").join("");
							if (content) {
								const existing = messages.findIndex((m) => m.id === json.message.id);
								if (existing >= 0) messages[existing] = {
									id: json.message.id,
									role,
									content
								};
								else messages.push({
									id: json.message.id,
									role,
									content
								});
							}
						}
					} catch (_) {}
				}
			}
			if (chatId) {
				const match = window.location.pathname.match(/\/c\/([a-z0-9-]+)/);
				if (match) chatId = match[1];
				dispatchChatEvent({
					id: `chatgpt_${chatId}`,
					platform: "chatgpt",
					title: document.title.replace(" - ChatGPT", "").trim() || "Untitled",
					url: `https://chatgpt.com/c/${chatId}`,
					messages,
					updatedAt: /* @__PURE__ */ new Date()
				});
			}
		}
		function extractClaudeContent(content) {
			if (typeof content === "string") return content;
			if (Array.isArray(content)) return content.filter((c) => c.type === "text").map((c) => c.text || "").join("");
			return "";
		}
		function dispatchChatEvent(chat) {
			window.dispatchEvent(new CustomEvent("at_chat_captured", {
				detail: chat,
				bubbles: false
			}));
		}
	})();
	//#endregion
})();
