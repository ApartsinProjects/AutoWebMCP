# AutoWebMCP

**Turn any web app into a set of reliable, reusable AI tools — automatically.**

---

## The Problem

Every time an AI agent interacts with a web application, it starts from scratch: take a screenshot, guess where to click, hope the DOM hasn't changed, repeat. This approach is:

- **Fragile** — one UI update and everything breaks
- **Slow** — screenshot, analyze, click, screenshot again... for every single action
- **Wasteful** — the same app gets re-figured-out in every session
- **Unreliable** — wrong clicks, missed elements, timing failures

AI agents deserve better than pixel-hunting.

## The Solution

AutoWebMCP flips the approach: **teach the AI once, then let it use what it learned forever.**

```
/learn-webapp https://sites.google.com
```

That's it. AutoWebMCP explores the app, figures out what operations it supports, and generates a permanent MCP server with semantic tools like `set_page_title()`, `insert_text_box()`, `add_page()`.

From that point on, the AI calls these tools directly — no screenshots, no guessing, no fragility.

### Before vs After

```
BEFORE (raw browser automation):
  1. Take screenshot                         ~2s
  2. Analyze image to find "title" element   ~3s
  3. Calculate click coordinates             ~1s
  4. Click at (672, 195)                     ~1s
  5. Take screenshot to verify               ~2s
  6. Type the new title                      ~1s
  7. Take screenshot to confirm              ~2s
                                    Total: ~12s, may fail

AFTER (AutoWebMCP):
  1. set_page_title("My New Title")          ~0.5s
                                    Total: ~0.5s, reliable
```

---

## Quick Start

### 1. Learn an app

```
/learn-webapp https://your-app.com
```

AutoWebMCP will:
- Open the app and map its UI
- Discover all available operations
- Show you the tool list for approval
- Generate a ready-to-use MCP server

You stay in control — it asks before clicking anything risky and you approve the final tool list.

### 2. Use it

Next time you ask Claude to do anything with that app, it just works:

```
You:    "Add a new page called About and set the theme to Diplomat"
Claude: Done. 2 MCP tools called, 0 errors.
```

No setup needed. The WebMCP router automatically detects the app, finds the matching MCP server, and routes through semantic tools.

### 3. Share it

```bash
git push
```

Your learned MCP server is now available to anyone who clones the repo. When another user asks Claude to interact with the same app, WebMCP downloads the MCP server from GitHub automatically — they don't need to learn it again.

---

## What Gets Generated

When you learn an app, AutoWebMCP creates a complete MCP server. For example, learning Google Sites produced **33 tools**:

| Tool | What it does |
|------|-------------|
| `set_site_title` | Set the browser tab title |
| `set_page_title` | Set the hero heading |
| `insert_text_box` | Add a text section with content |
| `set_text_style` | Apply Heading/Subheading/Normal styles |
| `insert_button` | Add a clickable button with a link |
| `insert_divider` | Add a horizontal divider |
| `add_page` | Create a new page |
| `set_theme` | Change the site theme |
| `preview_site` | Enter preview mode |
| `undo` / `redo` | Undo or redo changes |
| ... | *and 23 more* |

Each tool executes JavaScript directly via Chrome DevTools Protocol — no screenshots, no coordinate math, no guessing.

---

## How It Works (The Simple Version)

```
        You say:                    AutoWebMCP does:
   ┌──────────────┐
   │ "Learn this  │──── Explores the app, discovers operations,
   │  web app"    │     generates an MCP server with semantic tools
   └──────────────┘

   ┌──────────────┐
   │ "Update the  │──── Finds the matching MCP, calls set_title()
   │  title"      │     and insert_text_box() directly — done
   └──────────────┘

   ┌──────────────┐
   │ "Add a       │──── Tool missing? Learns it on the spot,
   │  contact     │     adds to the MCP, keeps going
   │  form"       │
   └──────────────┘
```

Behind the scenes, there are two Claude Code skills:

- **`/learn-webapp`** — Explores a web app and generates an MCP server
- **`/webmcp`** — Automatically routes your requests through learned MCP tools

You only need to remember `/learn-webapp`. Everything else is automatic.

---

## Keeping MCPs Up to Date

Apps change. AutoWebMCP handles that with four re-learning modes:

```
/learn-webapp https://sites.google.com
```

```
An MCP already exists for google-sites (33 tools).
What would you like to do?

  a) Re-learn from scratch — full exploration, new version
  b) Update/extend — keep existing tools, add new ones
  c) Validate & fix — test each tool, fix broken selectors
  d) Learn separate MCP — create an independent tool set
```

---

## The Bigger Picture

Every web app you learn becomes a permanent, shareable set of AI tools.

**Today**: You learn Google Sites. Now Claude can build and edit sites through 33 reliable tools instead of fragile clicks.

**Tomorrow**: Someone learns Notion. Another person learns Figma. Someone else learns Salesforce. Each learned app becomes an MCP server in the catalogue.

**The vision**: A growing library of pre-learned web applications that any AI agent can use instantly — downloaded from GitHub on first use, no learning required.

```
catalogue.json
├── google-sites    → 33 tools
├── notion          → 45 tools  (someone contributes this)
├── figma           → 60 tools  (someone contributes this)
├── salesforce      → 80 tools  (someone contributes this)
└── your-app        → you learn it in 5 minutes
```

Every learned app makes the entire ecosystem more capable.

---

## Current Status

| What | Status |
|------|--------|
| Learning skill (`/learn-webapp`) | Working — tested on Google Sites |
| Runtime router (`/webmcp`) | Working — auto-routes through MCP tools |
| Google Sites MCP | v2.0.0 — 33 tools, 87% confidence |
| Auto-install in `.mcp.json` | Working — MCP servers register automatically |
| Auto-launch Chrome with CDP | Working — asks user profile vs sandbox mode |
| Gap analysis & on-demand learning | Working — learns missing tools inline |
| GitHub catalogue sharing | Working — downloads MCPs from remote catalogue |
| Other web apps | Not yet learned — contributions welcome! |

---

## For Contributors

Want to add an MCP for your favorite web app?

1. Clone this repo
2. Run `/learn-webapp https://your-app.com`
3. Approve the generated tools
4. `git push`

That's it. Your MCP is now available to everyone.

See the [docs/](docs/) directory for technical details on the generated server structure, mode switches, and catalogue format.

## License

MIT
