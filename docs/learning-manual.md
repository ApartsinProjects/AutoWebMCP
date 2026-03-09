# Learning Manual — `/learn-webapp`

> Teach Claude a web application once. Use it forever.

This manual covers the **learning skill** — the process of exploring a web application,
inferring its semantic operations, and generating a reusable MCP server.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
  - [Phase 0: Chrome CDP Setup](#phase-0-chrome-cdp-setup)
  - [Phase 1: Initialization](#phase-1-initialization)
  - [Phase 2: Page Reconnaissance](#phase-2-page-reconnaissance)
  - [Phase 3: Interaction Exploration](#phase-3-interaction-exploration)
  - [Phase 4: Operation Inference](#phase-4-operation-inference)
  - [Phase 5: Code Generation](#phase-5-code-generation)
  - [Phase 6: Validation & Publication](#phase-6-validation--publication)
  - [Phase 7: Manual Tool Addition](#phase-7-manual-tool-addition)
- [Re-Learning Modes](#re-learning-modes)
- [Generated Server Architecture](#generated-server-architecture)
  - [commands.mjs — Command Library](#commandsmjs--command-library)
  - [index.mjs — MCP Server](#indexmjs--mcp-server)
  - [manifest.json — Capabilities Metadata](#manifestjson--capabilities-metadata)
- [Template Utilities Reference](#template-utilities-reference)
- [exec() Interceptors](#exec-interceptors)
- [Browser Mode Switches](#browser-mode-switches)
- [Troubleshooting](#troubleshooting)

---

## Overview

The `/learn-webapp` skill is the core of AutoWebMCP. It takes a URL, explores the
web application in a real Chrome browser, identifies what operations the app supports,
and generates a complete MCP (Model Context Protocol) server that exposes those
operations as callable tools.

**What it replaces:** Every time Claude interacts with a web app via computer use, it
screenshots the screen, analyzes the image, calculates click coordinates, clicks, and
screenshots again. This is slow (~12 seconds for a single operation) and fragile.

**What it produces:** A permanent MCP server where each operation is a single function
call (~0.5 seconds, reliable).

## Prerequisites

| Requirement | Details |
|---|---|
| **Claude Code** | With [MCP support](https://docs.anthropic.com/en/docs/claude-code/mcp) |
| **Node.js** | 18+ (required by the MCP SDK) |
| **Google Chrome** | Any recent version — the skill auto-detects the installation path |
| **Claude in Chrome extension** | Required during the learning phase for browser interaction |

> **No manual Chrome setup needed.** The skill automatically detects Chrome, launches
> it with remote debugging enabled, and manages the CDP connection.

## Quick Start

```
/learn-webapp https://your-app.com
```

That's it. The skill will:
1. Launch Chrome with CDP if needed
2. Navigate to the app
3. Explore the UI systematically
4. Present you with a list of discovered tools for approval
5. Generate a complete MCP server
6. Validate each tool against the live app
7. Register the server in `.mcp.json`

You stay in control throughout — the skill asks before clicking anything risky and
you approve the final tool list before code generation begins.

---

## How It Works

### Phase 0: Chrome CDP Setup

The skill communicates with Chrome through the **Chrome DevTools Protocol (CDP)**
on port 9222. On startup, it tests connectivity:

```bash
curl -s http://127.0.0.1:9222/json/version
```

If Chrome isn't running with CDP, the skill offers two browser modes:

| Mode | Description | Best for |
|---|---|---|
| **User profile** | Dedicated CDP profile directory with your credentials | Apps requiring authentication |
| **Sandbox** | Clean temporary profile with no stored data | Public apps, testing |

**Important:** Chrome requires `--user-data-dir` set to a non-default directory for
CDP to work. The skill uses a dedicated `CDP-Profile` directory that persists your
login sessions across learning sessions.

**Connection health probing:** Before every major phase, the skill verifies CDP
connectivity. If Chrome crashes or the tab closes mid-exploration, it detects
the failure and offers to relaunch.

### Phase 1: Initialization

1. Parses the URL and derives an app name (e.g., `sites.google.com` → `google-sites`)
2. Checks `catalogue.json` for an existing MCP — if found, offers re-learning options
3. Creates the output directory structure:

```
MCPs/<app-name>/
├── exploration/          # Exploration logs and snapshots
│   └── log.json          # Structured exploration log
├── server/               # Generated MCP server
│   ├── index.mjs         # MCP server entry point
│   ├── commands.mjs      # Command library
│   ├── package.json      # Dependencies
│   └── manifest.json     # Capabilities metadata
├── README.md             # Generated documentation
└── test-task.md          # Integration test + results
```

4. Opens the app in Chrome and captures a baseline screenshot

### Phase 2: Page Reconnaissance

**Goal:** Build a complete map of the application's UI without clicking anything.

The skill reads the **accessibility tree** (not screenshots) to identify:

- **Regions:** Navigation bars, content areas, toolbars, sidebars, panels
- **Interactive elements:** Buttons, inputs, links, dropdowns, toggles
- **Element metadata:** ARIA labels, roles, data attributes, text content

**Key detection capabilities:**

| Detection | What it catches |
|---|---|
| **Obfuscated DOM** | Apps like Facebook/Gmail with hashed CSS classes (`x9f619`, `_a9--`) — CSS selectors are deprioritized, ARIA/text matching used instead |
| **Duplicate elements** | Card-based UIs where the same button exists per card (e.g., "Delete" on each question in Google Forms) — visibility filtering applied |
| **ARIA classification** | Each element scored as semantic (aria-label), structural (role+parent), or text-only — affects confidence scoring |

**Overlay dismissal (Phase 2.5):** Before exploration begins, the skill clears any
blocking overlays — AI assistant dialogs (Gemini, Copilot), cookie banners, onboarding
tours, promotional modals. Priority is given to privacy-preserving choices (reject
cookies, dismiss tours).

### Phase 3: Interaction Exploration

**Goal:** Systematically probe interactive elements to understand what they do.

The skill explores elements by region, prioritizing:
1. Primary actions (compose, create, submit)
2. Form inputs (text fields, dropdowns)
3. Navigation (menus, tabs)
4. Secondary actions (toolbar buttons, toggles)

**For each element, the exploration procedure is:**

1. **Pre-state capture** — screenshot + accessibility snapshot
2. **Danger-zone check** — classify risk before clicking:
   - **SKIP:** Publish, Send, Delete All, Pay (never clicked)
   - **SAFE:** Tabs, menus, expand/collapse, preview (clicked freely)
   - **CAUTIOUS:** Single delete, toggle, create (clicked and undone)
3. **Execute interaction** — click, type, hover, or select
4. **Trusted click detection** — if JS `.click()` fails (no DOM change), retry
   with CDP browser-level click. Elements requiring trusted clicks are flagged
   with `requiresTrustedClick: true`
5. **Post-state capture** — screenshot + snapshot, diff against pre-state
6. **Record observation** — what changed, what selectors work, what pattern it follows
7. **Reset state** — close dialogs, navigate back, undo changes

**Widget interaction pattern classification:**

| Pattern | Description | Code Pattern |
|---|---|---|
| `direct-click` | Single JS click produces the effect | `el.click()` |
| `trusted-click` | Requires browser-level click (isTrusted) | `return { __clickCoords: {x, y} }` |
| `dropdown-option` | Click opens listbox, then click option | `el.click(); sleep(300); option.click()` |
| `focus-type` | Focus element, then type via setInputValue | `el.focus(); setInputValue(el, value)` |
| `contenteditable` | ContentEditable div, selectAll + insertText | `setContentEditableValue(el, value)` |
| `multi-step-cascade` | Trigger → panel → fill → confirm | `clickAndWait(trigger, panel)` |
| `toggle` | Click toggles state, read back aria-checked | `el.click(); return el.getAttribute('aria-checked')` |

**Multi-view discovery:** When the app has distinct views (e.g., a form list page vs.
a form editor), each view is explored separately and operations are tagged by view.

**Authentication handling:** If the app redirects to a login page, the skill pauses
and asks you to log in manually. It monitors the browser URL and resumes once
authentication completes.

### Phase 4: Operation Inference

**Goal:** Derive semantic operations from the exploration data.

The skill analyzes all explorations and identifies four types of operations:

1. **Single-action** — one click/input produces a result (toggle dark mode, refresh)
2. **Multi-step** — sequences forming a workflow (compose → fill → send)
3. **Parameterized** — actions taking user data (search for X, set field to Y)
4. **Query** — reading/extracting visible state (get unread count, list items)

Each operation gets:
- A `snake_case` name and human-readable description
- Parameter schema with types and descriptions
- Multi-fallback selector arrays ordered by resilience score
- Confidence score (0.0–1.0) based on selector quality and validation

**Selector priority scoring:**

| Score | Selector Type | Example |
|---|---|---|
| 5 | `aria-label` | `[aria-label="Add question"]` |
| 5 | `data-testid` | `[data-testid="compose-btn"]` |
| 4 | `data-tooltip` | `[data-tooltip="Add question"]` |
| 3 | `role` + text | `findElementByText("button", "Add")` |
| 2 | CSS class | `.compose-button` |
| 1 | Text-only | `findButtonByText("Insert")` |
| 0 | Positional | `querySelectorAll('input')[2]` |

**App-specific helper extraction:** Repeated patterns across operations (same selector
in 3+ operations, same multi-step sequence) are extracted as named helper functions.

### Phase 4.5: User Approval Gate

**This is mandatory — code generation cannot proceed without your approval.**

The skill presents a numbered table of all discovered tools:

```
## Proposed tools for google-forms MCP server

| # | Tool Name            | Description                          |
|---|----------------------|--------------------------------------|
| 1 | set_form_title       | Set the form title text              |
| 2 | add_question         | Add a new question to the form       |
| 3 | set_question_type    | Change the type of a question        |
| ...                                                            |
```

You can:
- **Approve** — proceed to code generation
- **Remove tools** — "Remove 3 and 7"
- **Add a tool** — "Add a tool for duplicating a page" (triggers Phase 7 exploration)

The gate loops until you explicitly approve.

### Phase 5: Code Generation

**Goal:** Generate the complete MCP server package from approved operations.

The skill reads template files and generates:

1. **`commands.mjs`** — All operations as exported async functions, plus framework
   utility functions and app-specific helpers
2. **`index.mjs`** — MCP server entry point with CDP connection, helper injection,
   tool registrations, and the `exec()` execution engine
3. **`package.json`** — Dependencies (`@modelcontextprotocol/sdk`, `puppeteer-core`)
4. **`manifest.json`** — Server metadata with operation list and confidence scores
5. **`README.md`** — Human-readable documentation for the generated server

**Mandatory code quality rules:**
- `waitForElement()` over `sleep()` — every click that triggers DOM change must wait
  for the expected result, not use blind delays
- Semantic selectors first — `aria-label` and `data-testid` before CSS classes
- Readback verification — every set/update operation reads back the DOM to confirm
  the change actually took effect
- Multi-view state guards — operations check they're on the correct view before executing
- Everything exported — all functions (utilities and operations) must be `export`ed so
  the dynamic injection system can collect and inject them

### Phase 6: Validation & Publication

**6.1 Per-tool live validation:** Every generated tool is executed against the live
app in the browser. For mutation tools, the change is verified via DOM readback and
then undone. Tools must achieve a 70% pass rate minimum.

**6.1.2 End-to-end test task:** A realistic multi-step scenario that chains 5-8 tools
together, written to `test-task.md`. This catches integration issues that per-tool
validation misses (focus management, state transitions, timing).

**6.2 Catalogue update:** The new MCP is registered in `catalogue.json`.

**6.3 Auto-register:** The MCP server is added to `.mcp.json` so Claude Code loads
it on next restart.

**6.4 Results report:** A table of all learned tools with confidence scores, plus
failed operations, low-confidence warnings, and unexplored areas.

### Phase 7: Manual Tool Addition

After initial learning, you can add individual tools on demand:

```
add tool: archive conversation — moves the current conversation to archive
```

The skill explores the specific operation, validates it, and appends it to the
existing MCP server files without regenerating everything.

---

## Re-Learning Modes

When you run `/learn-webapp` on an app that already has an MCP server, you get
four options:

| Mode | What it does | Version impact |
|---|---|---|
| **Re-learn from scratch** | Full exploration, new server | Major bump (1.0 → 2.0) |
| **Update/extend** | Keep existing tools, add new ones | Minor bump (1.0 → 1.1) |
| **Validate & fix** | Test each tool, fix broken selectors | Patch (updates confidence) |
| **Learn separate MCP** | Create independent tool set | New MCP entry |

---

## Generated Server Architecture

### commands.mjs — Command Library

The command library contains three sections:

```javascript
// --- Framework Utilities (from template) ---
// querySelector, waitForElement, setInputValue, etc.
// 20 exported utility functions

// --- App-Specific Helpers ---
// Extracted from repeated patterns across operations
// e.g., getActiveQuestionCard(), isEditor(), clickSidebarTab()

// --- Learned Operations ---
// One exported async function per approved tool
// e.g., set_form_title({ title }), add_question({ text, type })
```

**Every function must be exported** — the server's injection system uses
`Object.entries(commands).filter(...)` to collect all exports and inject them
into the browser context via CDP. Non-exported helpers will be undefined at runtime.

### index.mjs — MCP Server

The server entry point handles:

1. **CDP connection** via `puppeteer-core` with 4 mode combinations
2. **Helper injection** — all `commands.mjs` exports injected into browser context
   once per page via `evaluateOnNewDocument` (survives navigations, bypasses CSP)
3. **Tool registration** — each operation registered as an MCP tool with JSON schema
4. **`exec()` engine** — executes operations with interceptors, retry, and URL re-check
5. **Built-in tools** — `health_check`, `get_page_state`, `show_scripts`, `run_script`

### manifest.json — Capabilities Metadata

```json
{
  "name": "google-forms-mcp",
  "version": "1.0.0",
  "targetApp": {
    "url": "https://docs.google.com/forms/",
    "urlPattern": "docs\\.google\\.com/forms"
  },
  "operations": [
    { "name": "set_form_title", "confidence": 0.90, "category": "data_entry" }
  ]
}
```

---

## Template Utilities Reference

These functions are available in every generated `commands.mjs`:

| Function | Purpose |
|---|---|
| `querySelector(selectors)` | Try multiple CSS selectors, return first match |
| `querySelectorAll(selectors)` | Try multiple selectors, return all matches |
| `queryVisibleSelector(selectors)` | Like querySelector but only visible matches |
| `querySelectorWithin(root, selectors)` | Scoped query within a root element |
| `waitForElement(selectors, timeout)` | Wait for element to appear (MutationObserver) |
| `waitForRemoval(selector, timeout)` | Wait for element to disappear |
| `sleep(ms)` | Pause (animation timing only, never as sole wait) |
| `setInputValue(el, value)` | Set value on `<input>`/`<textarea>` |
| `setContentEditableValue(el, value)` | Set value on contentEditable elements |
| `clickByAriaLabel(label)` | Click element by aria-label |
| `findButtonByText(text)` | Find button or [role="button"] by text |
| `findElementByText(role, text, opts)` | Find element by ARIA role + text |
| `clickMenuItem(itemText)` | Click menu item by text |
| `clickAndWait(clickSel, waitSel, timeout)` | Click then wait for result |
| `multiStep(steps)` | Sequential click-and-wait steps |
| `getPageState()` | Current URL, title, active element, dialogs |
| `navigateTo(url)` | Navigate via `__navigate` signal |
| `getRepeatingContainers(anchor, levels, verify)` | Find feed/card containers |
| `menuCascade(itemTexts, delay)` | Navigate cascading menus |
| `selectRadioByIndex(group, index)` | Select radio via trusted click |
| `togglePanel(trigger, panel, action)` | State-aware panel toggle |

---

## exec() Interceptors

The `exec()` function in `index.mjs` processes special return values from command
functions, enabling operations that can't be done purely in JavaScript:

| Interceptor | Trigger | What it does |
|---|---|---|
| `__clickCoords` | `{ __clickCoords: {x, y} }` | Performs trusted browser-level click via Puppeteer (for widgets checking `event.isTrusted`) |
| `__hoverCoords` | `{ __hoverCoords: {x, y} }` | Moves mouse to coordinates, waits for hover UI to appear |
| `__keyPress` | `{ __keyPress: "Enter" }` | Sends keyboard events via Puppeteer (search submit, Escape) |
| `__navigate` | `{ __navigate: url }` | Navigates page at Puppeteer level (avoids race conditions) |
| `__followUp` | `{ __followUp: "funcName()" }` | Evaluates JavaScript after the intercepted action completes |

**Retry logic:** On first failure, `exec()` re-injects helpers and retries once.
This catches cases where a navigation cleared the injected functions.

**URL re-check:** After execution, if the URL changed but still matches the app's
URL pattern, helpers are re-injected for the new page state.

---

## Browser Mode Switches

Every generated MCP server supports two independent environment variables:

| Variable | Values | Default |
|---|---|---|
| `BROWSER_MODE` | `visible`, `headless` | `visible` |
| `DATA_MODE` | `user`, `sandbox` | `user` |

**Mode combinations:**

| BROWSER_MODE | DATA_MODE | Use Case |
|---|---|---|
| `visible` | `user` | **Default.** Works in your running Chrome session |
| `visible` | `sandbox` | Testing — visible browser, clean profile |
| `headless` | `user` | Background automation with saved credentials |
| `headless` | `sandbox` | CI/testing — fully isolated |

Set in `.mcp.json`:
```json
{
  "env": {
    "BROWSER_MODE": "visible",
    "DATA_MODE": "user"
  }
}
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `Target closed` during exploration | Chrome tab was closed | Skill auto-detects and offers to re-navigate |
| `Session closed` or `Protocol error` | CDP connection lost | Skill runs health check and relaunches Chrome |
| Tool returns `selector_not_found` | App UI changed since learning | Re-run `/learn-webapp` with "Validate & fix" option |
| `isTrusted` click failures | Widget rejects JS `.click()` | Skill auto-detects and uses `__clickCoords` pattern |
| Helpers undefined in browser | Function not exported | Ensure all functions in `commands.mjs` use `export` |
| CSP blocks script injection | App has strict Content Security Policy | Template uses CDP protocol methods which bypass CSP |
| Readback mismatch | Input method doesn't match element type | Switch between `setInputValue` and `setContentEditableValue` |

---

Generated by [AutoWebMCP](https://github.com/ApartsinProjects/AutoWebMCP).
