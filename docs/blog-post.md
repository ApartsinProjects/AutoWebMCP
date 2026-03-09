# I Taught Claude to Use Web Apps Without Screenshots. Here's How.

*Computer use is powerful. But doing the same thing every session? That's just waste.*

---

## The Problem With Computer Use

Claude Code can interact with web applications through computer use — screenshot the screen, analyze the image, calculate where to click, click, screenshot again, verify. It works. But it's slow, fragile, and repetitive.

Every time you ask Claude to edit a Google Sites page, it goes through the same discovery process: screenshot, find the title field, figure out the coordinates, click, type, screenshot to verify. Twelve seconds and seven tool calls for something that should take half a second.

The worst part? Claude already figured out where the title field is *last session*. It just forgot.

## What If Claude Could Remember?

That's the core idea behind AutoWebMCP. Instead of rediscovering a web app's layout every session, we teach Claude once and let it use what it learned forever.

The mechanism is MCP — Anthropic's Model Context Protocol. MCP lets Claude call external tools through a standardized interface. So instead of:

```
screenshot() → analyze → click([672, 195]) → type("My Title") → screenshot()
```

Claude just calls:

```
set_page_title("My Title")
```

One function call. Half a second. Reliable.

## How It Works

The system has two phases: **learning** and **using**.

### Learning Phase

You point AutoWebMCP at a web app:

```
/learn-webapp https://sites.google.com
```

Claude opens the app in Chrome (via CDP), takes an accessibility tree snapshot, and systematically explores the UI. It clicks buttons, opens menus, fills fields, and observes what happens. Each interaction is recorded — what element was clicked, what changed, what selectors identify it.

From these observations, Claude infers semantic operations. "Clicking this button with aria-label 'Insert' opens a menu; selecting 'Text box' from that menu inserts a text section." That becomes `insert_text_box()`.

You approve the tool list before anything gets generated. You can remove tools, add missing ones, or adjust descriptions.

Then AutoWebMCP generates a complete MCP server — a Node.js process that exposes each operation as a callable tool through the MCP protocol. The generated code uses Chrome DevTools Protocol to execute JavaScript directly in the page context. No screenshots. No coordinate math.

### Using Phase

Next time you ask Claude to interact with that app, the `/webmcp` skill fires automatically. It checks the catalogue, finds the matching MCP server, and routes through semantic tools instead of falling back to computer use.

```
You:    "Add a new page called About and set the theme to Diplomat"
Claude: Done. 2 MCP tools called, 0 errors.
```

## The Technical Details

Each generated MCP server consists of:

- **`commands.mjs`** — Exported JavaScript functions that run in the browser context. Each function finds elements by semantic selectors (aria-label, role, data attributes), performs the operation, and returns a structured result with readback verification.

- **`index.mjs`** — The MCP server entry point. Connects to Chrome via CDP, injects all helper functions into the page context, and registers each operation as an MCP tool with parameter schemas.

- **`manifest.json`** — Metadata about the server: target URL, URL pattern, operation list with confidence scores.

The server connects to Chrome in four modes: visible+user (default — attaches to your running browser), visible+sandbox (clean profile), headless+user (background automation), headless+sandbox (CI/testing).

### What Makes It Robust

The framework includes several mechanisms that make generated tools reliable:

**Trusted click support.** Some UI widgets (radio buttons, certain menu items in Google apps) reject JavaScript `.click()` because they check `event.isTrusted`. When a command needs a browser-level click, it returns `{ __clickCoords: {x, y} }` and the server performs the click through Puppeteer's `page.mouse.click()`, which the browser treats as trusted.

**Hover and keyboard support.** Commands can return `__hoverCoords` for hover-dependent UI (reaction bars, tooltip menus) or `__keyPress` for keyboard interactions (search submissions, Escape to close dialogs). The server handles these at the Puppeteer level.

**Helper injection.** All utility functions from `commands.mjs` are dynamically injected into the browser context via CDP `evaluateOnNewDocument`. This bypasses Content Security Policy restrictions and survives page navigations.

**Retry with re-injection.** If a tool call fails (typically because a navigation cleared the injected functions), the server re-injects helpers and retries once.

**Readback verification.** Every mutation tool reads back the DOM after setting a value to confirm the change actually took effect. Silent failures are caught and reported.

## Real Numbers

Learning Google Sites produced 33 tools. Learning Google Forms produced 30 tools. Each tool replaces a 5-7 step computer use sequence.

| Metric | Computer Use | AutoWebMCP |
|--------|-------------|------------|
| Set a page title | ~12s, 7 calls | ~0.5s, 1 call |
| Batch: title + 5 pages + theme | ~80s, 40+ calls | ~1s, 1 call (via `run_script`) |
| Reliability | Breaks on layout changes | Semantic selectors adapt |

The `run_script` escape hatch is worth highlighting. Every generated server includes it — execute arbitrary JavaScript in the page context with all helper functions pre-injected. One CDP round-trip for as many operations as you want.

## The Crowdsourced Vision

Every learned MCP server is a standard Node.js package that ships with the repo. When you push your learned server, anyone who clones the repo gets instant access. The `/webmcp` skill can also download servers from GitHub on first use.

The catalogue currently has two entries. The goal is hundreds — Google Workspace, Notion, Jira, Figma, Salesforce, and every other web app people interact with through Claude. Each contributed server eliminates computer use overhead for every future user.

## Try It

```bash
git clone https://github.com/ApartsinProjects/AutoWebMCP.git
cd AutoWebMCP && npm install
```

Open in Claude Code. Type `/learn-webapp https://your-app.com`. Approve the tools. Done.

The project is MIT licensed and contributions are welcome. Every app you learn makes the ecosystem more capable.

---

*AutoWebMCP is open source at [github.com/ApartsinProjects/AutoWebMCP](https://github.com/ApartsinProjects/AutoWebMCP).*

*Built by [Sasha Apartsin](https://www.apartsin.com).*
