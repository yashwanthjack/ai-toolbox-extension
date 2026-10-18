# AI Toolbox Chrome Extension

> Folders, search, and export for ChatGPT and Claude — 100% local, zero server cost.

## Features (MVP v1.0)

| Feature | How to use |
|---|---|
| **Folders** | Sidebar folder tree auto-injects into ChatGPT & Claude. Click `+` to create, drag chats in. |
| **Unified Search** | Press `Ctrl+Shift+.` (Win) / `Cmd+Shift+.` (Mac) from any tab. |
| **Prompt Library** | Type `//` in any ChatGPT/Claude input box. Select a prompt, hit Enter. |
| **Export** | Click the Export button in the chat toolbar → choose Markdown or TXT. |

## Loading into Chrome (Development)

1. Run `npm run build` to generate the `dist/` folder.
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `dist/` folder from this project
6. The extension icon appears in your toolbar!

## Development Workflow

```bash
# Install dependencies
npm install

# Build once
npm run build

# Build & watch for changes (reload extension manually after each build)
npm run build:watch
```

> **Tip**: After `build:watch` rebuilds, go to `chrome://extensions` and click the 🔄 refresh button on the AI Toolbox card to reload your changes.

## Project Structure

```
src/
├── background/
│   └── service-worker.js    # MV3 background worker — keyboard shortcuts, install
├── content/
│   ├── main-world.js        # MAIN world — patches window.fetch to capture chats
│   ├── injector.js          # ISOLATED world — injects Shadow DOM UI into sidebar
│   ├── platforms/
│   │   ├── chatgpt.js       # ChatGPT DOM selectors & drag support
│   │   └── claude.js        # Claude DOM selectors & drag support
│   └── ui/
│       ├── sidebar.js       # Folder tree + pinned chats
│       ├── search-modal.js  # Cmd+K search overlay
│       ├── prompt-menu.js   # // slash prompt picker
│       └── export-btn.js    # Download as MD or TXT
├── db/
│   ├── db.js                # Dexie.js schema (IndexedDB)
│   └── search-index.js      # MiniSearch wrapper
├── popup/
│   ├── popup.html           # Extension popup
│   ├── popup.js             # Popup controller
│   └── popup.css            # Popup styles
└── styles/
    └── shadow.css           # Shadow DOM UI styles (scoped)
```

## Architecture

```
chatgpt.com / claude.ai
       │
       ├─ main-world.js (MAIN world)
       │   └─ Patches window.fetch
       │   └─ Dispatches CustomEvent("at_chat_captured")
       │
       └─ injector.js (ISOLATED world)
           ├─ Receives chat events → indexes in MiniSearch + Dexie.js
           ├─ Injects Shadow DOM sidebar with Folder Tree
           ├─ Opens Cmd+K search modal
           ├─ Watches // in chat input for Prompt Menu
           └─ Injects Export button in toolbar

Background Service Worker
   └─ Routes keyboard shortcut → content script
   └─ Handles install (sets free tier defaults)
   └─ Message bus for tier checks
```

## Free vs Pro Limits

| Feature | Free | Pro |
|---|---|---|
| Folders | 10 | Unlimited |
| Prompts | 20 | Unlimited |
| Search results | 5 per query | Unlimited |

### Activating Pro (Demo)
In the extension popup → Settings → paste a license key starting with `AT-PRO` to activate Pro locally.

## Roadmap

- [ ] Gemini + Grok support (Week 3)
- [ ] Real license key verification (Zoho Catalyst API)
- [ ] Razorpay/Lemon Squeezy payment integration
- [ ] Obsidian vault sync (File System Access API)
- [ ] Context window token meter
- [ ] Cross-AI "Continue in Claude/ChatGPT" teleport button
- [ ] Auto-tagging with browser WebLLM or Gemini Flash API
