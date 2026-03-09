# Usage Manual — `/webmcp`

> Route web application tasks through learned MCP servers instead of raw browser automation.

This manual covers the **runtime routing skill** — how AutoWebMCP intercepts web app
tasks and routes them through semantic MCP tools instead of computer use.

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Automatic Routing](#automatic-routing)
- [Using MCP Tools](#using-mcp-tools)
  - [Individual Tool Calls](#individual-tool-calls)
  - [Batch Operations with run_script](#batch-operations-with-run_script)
  - [Built-in Tools](#built-in-tools)
- [Execution Flow](#execution-flow)
  - [Step 0: Chrome CDP Setup](#step-0-chrome-cdp-setup)
  - [Step 1: Identify the Target App](#step-1-identify-the-target-app)
  - [Step 2: Check the Catalogue](#step-2-check-the-catalogue)
  - [Step 3: Route Based on Match](#step-3-route-based-on-match)
  - [Step 4: Plan & Gap Analysis](#step-4-plan--gap-analysis)
  - [Step 5: Execute the Task](#step-5-execute-the-task)
  - [Step 6: Report to User](#step-6-report-to-user)
- [Error Handling & Recovery](#error-handling--recovery)
- [When MCP Tools Aren't Enough](#when-mcp-tools-arent-enough)
- [Important Rules](#important-rules)
- [Catalogue Format](#catalogue-format)

---

## Overview

The `/webmcp` skill is the runtime counterpart to `/learn-webapp`. While the learning
skill generates MCP servers, the webmcp skill **uses** them.

It fires automatically whenever Claude Code is about to interact with a web application
that has a learned MCP server. You don't need to invoke it manually — it intercepts
the task and routes through semantic tools.

**Before (computer use):**
```
screenshot() → analyze image → click([672, 195]) → type("My Title") → screenshot()
~12 seconds, 7 tool calls, may fail on layout changes
```

**After (webmcp routing):**
```
set_page_title("My Title")
~0.5 seconds, 1 tool call, reliable
```

## How It Works

```
You say: "Update the title to Welcome and add a new page called About"

WebMCP:
  1. Identifies the target app (Google Sites)
  2. Finds matching MCP in catalogue (google-sites, 33 tools)
  3. Plans: set_page_title("Welcome") + add_page("About")
  4. Executes both MCP tool calls
  5. Reports: "Done. 2 tools called, 0 errors."
```

## Automatic Routing

The webmcp skill triggers on any web application interaction:
- "edit this site", "build a page", "add content"
- "change the theme", "fill this form"
- "create a site", "update the title"
- Any task involving a web app that has a learned MCP

**Trigger keywords:** web app interaction, site editing, form filling, content
management, theme changes, page creation.

---

## Using MCP Tools

### Individual Tool Calls

Each learned operation is exposed as a separate MCP tool with typed parameters:

```
set_page_title({ title: "Welcome" })
→ { success: true, readback: "Welcome" }

add_question({ text: "How was your experience?", type: "multiple choice" })
→ { success: true }

set_theme({ theme: "Diplomat" })
→ { success: true }
```

### Batch Operations with run_script

Every generated MCP server includes a `run_script` tool that executes arbitrary
JavaScript in the page context with all helper functions pre-injected. This enables
batch operations in a single CDP round-trip:

```javascript
run_script(`
  // Set title, add 5 pages, and change theme — all in one call
  await set_page_title("My Site");
  await add_page("About");
  await add_page("Services");
  await add_page("Portfolio");
  await add_page("Blog");
  await add_page("Contact");
  await set_theme("Diplomat");
  return { success: true, pages_added: 5 };
`)
```

**Performance:** One `run_script` call can replace 40+ individual tool calls.
The entire batch executes in ~1 second.

### Built-in Tools

Every generated MCP server includes four built-in tools:

| Tool | Purpose |
|---|---|
| `health_check` | Verify browser connectivity — returns Chrome version and page URL |
| `get_page_state` | Current URL, page title, active element, count of open dialogs/menus |
| `show_scripts` | List all JavaScript functions with names, parameters, and descriptions |
| `run_script` | Execute arbitrary JavaScript with all helpers pre-injected |

---

## Execution Flow

### Step 0: Chrome CDP Setup

The webmcp skill needs a CDP-enabled Chrome instance. It follows the same setup
procedure as the learning skill — tests port 9222, offers to launch Chrome if
needed, supports user profile and sandbox modes.

### Step 1: Identify the Target App

The skill extracts the target URL from:
- The user's message (explicit URL)
- The current browser tab
- Context clues ("update the Google Sites page" → `sites.google.com`)

### Step 2: Check the Catalogue

Reads `catalogue.json` to find a matching MCP server:

```json
{
  "applications": {
    "google-sites": {
      "urlPattern": "sites\\.google\\.com",
      "mcps": [{
        "name": "google-sites-mcp",
        "path": "MCPs/google-sites/server",
        "operationCount": 33
      }]
    }
  }
}
```

**Local check:** Looks for the MCP server directory at the catalogued path.

**Remote check:** If the MCP server isn't installed locally, it can be downloaded
from the GitHub repository automatically.

### Step 3: Route Based on Match

| Scenario | Action |
|---|---|
| **MCP exists, tools cover the task** | Execute via MCP tools |
| **MCP exists, some tools missing** | Use available tools + fall back to browser automation for gaps |
| **No MCP exists** | Suggest running `/learn-webapp` or fall back to computer use |

### Step 4: Plan & Gap Analysis

Before executing, the skill analyzes the user's request against available tools:

1. **Decompose** the task into individual operations
2. **Match** each operation to an MCP tool
3. **Identify gaps** — operations with no matching tool
4. **Plan execution order** — respecting dependencies (e.g., create page before editing it)

If gaps are found, the skill reports them:
```
Task requires 5 operations. 4 have MCP tools, 1 requires browser automation:
  ✅ set_page_title → MCP tool
  ✅ add_page (×3) → MCP tool
  ⚠️ upload_header_image → no MCP tool, will use browser automation
```

### Step 5: Execute the Task

**5.1 Navigate:** Ensure the browser is on the correct app page.

**5.2 Execute MCP tools:** Call each planned tool in order.

**5.3 Batch when possible:** Group independent operations into a single `run_script`
call for performance.

**5.4 Handle errors:** If a tool fails, diagnose and retry or fall back.

**5.5 Verify results:** After mutations, verify the DOM state matches expectations.

**5.6 Authentication handling:** If the app redirects to login mid-task, pause and
ask the user to re-authenticate.

### Step 6: Report to User

```
Done. 4 MCP tools called, 0 errors.
  - set_page_title("Welcome") ✅
  - add_page("About") ✅
  - add_page("Services") ✅
  - set_theme("Diplomat") ✅
```

---

## Error Handling & Recovery

The webmcp skill handles errors at multiple levels:

### Tool-Level Errors

Each tool returns structured errors with categories:

| Category | Meaning | Recovery |
|---|---|---|
| `selector_not_found` | Element selectors don't match the DOM | App may have updated — re-learn the tool |
| `timeout` | Element exists but didn't reach expected state | Retry after page stabilizes |
| `state_error` | Precondition not met (wrong view, not logged in) | Navigate to correct view first |
| `unknown` | Unexpected error | Report to user with context |

### Automatic Recovery

1. **Retry with re-injection:** If a tool fails because navigation cleared injected
   helpers, the server re-injects and retries once automatically
2. **URL re-check:** If the page URL changed within the app (e.g., clicking a form
   opens the editor), helpers are re-injected for the new page
3. **Fallback to browser automation:** If an MCP tool consistently fails, the skill
   can fall back to computer use for that specific operation

### Session Recovery

If Chrome crashes or the CDP connection drops:
1. The skill detects the failure via health check
2. Offers to relaunch Chrome
3. Re-navigates to the app
4. Resumes from the last successful operation

---

## When MCP Tools Aren't Enough

The webmcp skill gracefully handles situations where MCP tools don't cover
everything:

- **Missing tools:** Falls back to browser automation (computer use) for operations
  without MCP tools
- **Broken tools:** If a tool fails after retry, switches to browser automation
- **Complex interactions:** For highly dynamic or unusual operations, `run_script`
  can execute custom JavaScript
- **New features:** When an app adds new UI that wasn't present during learning,
  use `/learn-webapp` with "Update/extend" mode to add new tools

---

## Important Rules

1. **Always prefer MCP tools** over raw browser automation when available
2. **Never skip the catalogue check** — always look up available tools first
3. **Use `run_script` for batching** — don't call 10 individual tools when one
   batch script can do it in a single round-trip
4. **Report gaps honestly** — tell the user when tools are missing
5. **Don't modify MCP server code** at runtime — if tools need fixing, use
   `/learn-webapp` with validate mode
6. **Respect tool confidence scores** — prefer high-confidence tools over
   low-confidence ones when alternatives exist
7. **Verify mutations** — after setting values, confirm the change took effect
8. **Handle auth gracefully** — if redirected to login, pause and notify the user
9. **Use health_check proactively** — verify CDP connectivity before long operations
10. **Chain tools logically** — respect operation dependencies and execution order

---

## Catalogue Format

The `catalogue.json` file maps applications to their MCP servers:

```json
{
  "version": "2.0.0",
  "repository": "https://github.com/ApartsinProjects/AutoWebMCP",
  "applications": {
    "google-sites": {
      "displayName": "Google Sites",
      "url": "https://sites.google.com/",
      "urlPattern": "sites\\.google\\.com",
      "mcps": [{
        "name": "google-sites-mcp",
        "version": "1.0.0",
        "path": "MCPs/google-sites/server",
        "operationCount": 33,
        "confidence": 0.88,
        "generatedAt": "2025-11-15"
      }]
    },
    "google-forms": {
      "displayName": "Google Forms",
      "url": "https://docs.google.com/forms/",
      "urlPattern": "docs\\.google\\.com/forms",
      "mcps": [{
        "name": "google-forms-mcp",
        "version": "1.0.0",
        "path": "MCPs/google-forms/server",
        "operationCount": 30,
        "confidence": 0.85,
        "generatedAt": "2025-12-01"
      }]
    }
  }
}
```

**Multiple MCPs per app:** The `mcps` array supports multiple server versions.
When re-learning creates a new version, both coexist for rollback capability.

**URL pattern matching:** The `urlPattern` field is a regex tested against the
current browser URL. When a match is found, the corresponding MCP server is used.

---

Generated by [AutoWebMCP](https://github.com/ApartsinProjects/AutoWebMCP).
