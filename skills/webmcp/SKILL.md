---
name: webmcp
description: >
  Route web application tasks through learned MCP servers instead of raw browser
  automation. ALWAYS use this skill BEFORE interacting with any web application.
  Checks if a matching MCP server exists in the AutoWebMCP catalogue and instructs
  you to use its semantic tools (e.g., set_page_title, insert_text_box) instead of
  clicking and typing through the browser manually.
  Triggers on: any web app interaction, "edit this site", "build a page", "add content",
  "change the theme", "fill this form", "automate this app", "create a site",
  "update the site", or any task involving a web application that may have a learned MCP.
user-invocable: true
argument-hint: [url-or-app-name]
allowed-tools: Read, Glob, Grep, Bash
---

# WebMCP — Runtime Routing Skill

You are the AutoWebMCP runtime router. Your job is to intercept web application tasks
and route them through learned MCP servers when available, instead of using raw browser
automation (clicking, typing, screenshots).

**This skill should run BEFORE any browser interaction begins.**

### Resolve PROJECT_ROOT

Before doing anything, resolve `PROJECT_ROOT` — the root directory of the AutoWebMCP
project. Search upward from this skill file for a directory containing `catalogue.json`,
or use the current working directory if it contains `catalogue.json`.

---

## Step 1: Identify the Target Application

Determine which web application the user wants to interact with:

- If `$ARGUMENTS` contains a URL or app name, use that
- If the user's request mentions a web app by name (e.g., "Google Sites", "Gmail"), use that
- If a browser tab is already open, check its URL
- Extract the **domain** (e.g., `sites.google.com`, `mail.google.com`)

---

## Step 2: Check the Catalogue

### 2.1 Local Catalogue

Read the AutoWebMCP catalogue:

```
<PROJECT_ROOT>/catalogue.json
```

The catalogue maps applications to one or more MCP servers:

```json
{
  "version": "2.0.0",
  "repository": "ApartsinProjects/AutoWebMCP",
  "applications": {
    "<app-name>": {
      "displayName": "...",
      "url": "...",
      "urlPattern": "...",
      "mcps": [
        { "name": "...", "version": "...", "path": "MCPs/<app-name>/server", ... }
      ]
    }
  }
}
```

For each entry in `applications`, check if the target application's domain matches the
entry's `urlPattern` (regex match) or `url` (substring match).

### 2.2 Remote Catalogue (if local miss)

If no match is found locally, try fetching the catalogue from GitHub:

```bash
gh api repos/ApartsinProjects/AutoWebMCP/contents/catalogue.json -q .content | base64 -d
```

Parse the result and check for a match. This finds MCPs contributed by others that
haven't been downloaded yet.

---

## Step 3: Route Based on Match

### If a matching MCP server EXISTS in the catalogue:

1. **Select the best MCP** — if multiple MCPs exist for the app, pick the one with
   the highest confidence score and most operations. Show the user if there are choices.

2. **Check if server files exist locally**:
   - Look for `<PROJECT_ROOT>/<mcp.path>/index.mjs`
   - If files exist locally, skip to step 4

3. **Download from GitHub** (if not local):
   ```bash
   # Create local cache directory
   mkdir -p "<PROJECT_ROOT>/<mcp.path>"

   # Download server files from GitHub
   cd "<PROJECT_ROOT>/<mcp.path>"
   gh api repos/ApartsinProjects/AutoWebMCP/contents/<mcp.path> \
     --jq '.[].download_url' | while read url; do
       curl -sLO "$url"
     done

   # Install dependencies
   npm install
   ```

4. **Read the manifest** for the full tool list:
   ```
   <PROJECT_ROOT>/<mcp.path>/manifest.json
   ```

5. **Tell yourself (and the user) to use the MCP tools.** Output:

   ```
   Found learned MCP server: <name> (<N> tools, <confidence>% confidence)

   Available tools for this app:
   - tool_name_1: description
   - tool_name_2: description
   - ...

   I will use these semantic tools instead of raw browser automation.
   ```

6. **Check if the MCP server is installed** in the active MCP configuration.
   Check these files (in order):
   - `<PROJECT_ROOT>/.claude/settings.local.json`
   - `~/.claude/settings.local.json`
   - `~/.claude/settings.json`

   Look for a `"mcpServers"` entry matching the app name.

7. **If NOT installed**: Offer to add it to the MCP config. Generate the config
   snippet with the correct path and suggest adding it:

   ```json
   {
     "mcpServers": {
       "<app-name>": {
         "command": "node",
         "args": ["<PROJECT_ROOT>/<mcp.path>/index.mjs"],
         "env": {
           "CHROME_CDP_URL": "http://127.0.0.1:9222",
           "BROWSER_MODE": "visible",
           "DATA_MODE": "user"
         }
       }
     }
   }
   ```

   Ask the user if they want you to add it. If yes, merge it into the appropriate
   settings file. Note: Claude Code needs to be restarted for new MCP servers to
   take effect.

8. **If installed and running**: Proceed with the user's task using ONLY the MCP
   server's tools. Map the user's natural language request to the appropriate tool
   calls. For example:

   | User says...                          | Use tool...                              |
   |---------------------------------------|------------------------------------------|
   | "Set the title to X"                  | `set_page_title({ title: "X" })`        |
   | "Add a text section with Y"           | `insert_text_box({ text: "Y" })`        |
   | "Insert a button linking to Z"        | `insert_button({ name: "...", link: "Z" })` |
   | "Add a new page called W"             | `add_page({ name: "W" })`               |
   | "Change the theme"                    | `set_theme({ theme: "..." })`           |
   | "Undo that"                           | `undo()`                                 |
   | "Show me a preview"                   | `preview_site()`                         |
   | "Show me the scripts"                 | `show_scripts()`                         |

   **CRITICAL**: Do NOT fall back to raw browser clicks/typing for operations that
   have a matching MCP tool. Only use raw browser automation for operations that
   are NOT covered by the MCP server.

9. **If installed but tools fail**: Report the error to the user. Do NOT silently
   fall back to raw browser automation. Suggest:
   - Checking that Chrome is running with `--remote-debugging-port=9222`
   - Checking that the target app is open in a Chrome tab
   - Re-learning the operation if the app UI has changed

### If NO matching MCP server exists:

1. Inform the user:
   ```
   No learned MCP server found for <domain>.
   ```

2. Offer two options:
   - **Learn it now**: "I can explore this app and generate an MCP server for it.
     This takes a few minutes but creates reusable semantic tools. Want me to run
     /learn-webapp <url>?"
   - **Use raw automation**: "I can proceed with standard browser automation
     (clicking, typing). This works but is less reliable and not reusable."

3. Wait for the user's choice before proceeding.

---

## Step 4: Plan & Gap Analysis

**MANDATORY** — Before executing any task, create an execution plan and check for
missing tools. This step prevents mid-task failures and ensures full MCP coverage.

### 4.1 Create Execution Plan

Break the user's request into a sequence of discrete actions. For each action,
determine which MCP tool would handle it. Present the plan to the user:

```
Execution plan for: "<user's request summary>"

| # | Action                          | MCP Tool              | Status    |
|---|---------------------------------|-----------------------|-----------|
| 1 | Set the page title              | set_page_title        | available |
| 2 | Add introduction text           | insert_text_box       | available |
| 3 | Insert a contact form           | —                     | MISSING   |
| 4 | Add a map embed                 | insert_embed          | available |
| 5 | Change background color         | —                     | MISSING   |
```

### 4.2 Gap Analysis

Compare the plan against the available MCP tools. Identify any actions that have
**no matching tool** in the current MCP server.

If **all tools are available**: Report the plan and proceed to Step 5 (Execute).

If **tools are missing**: List the gaps and present the user with options:

```
Gap analysis: 2 of 5 actions require tools not in the current MCP

Missing tools:
  - "Insert a contact form" — no tool for form insertion
  - "Change background color" — no tool for background/style changes

Options:
  a) Learn missing tools first — I'll explore the app to learn these operations
     and add them to the MCP before proceeding. (~2-5 min per tool)
  b) Skip missing — proceed with available tools only, skip actions that need
     missing tools
  c) Use raw automation for gaps — use MCP tools where available, fall back to
     browser automation for the missing ones
```

### 4.3 Handle User Choice

**If user chooses (a) — Learn missing tools**:

1. For each missing tool, activate the learn-webapp skill's Phase 7 (Manual Tool
   Addition) workflow:
   - Explore the app to find how the action is performed
   - Define the operation with selectors and procedure
   - Validate it works
   - Add the new function to `commands.mjs`
   - Register the new tool in `index.mjs`
   - Update `manifest.json` and `catalogue.json`

2. After all missing tools are learned, re-display the execution plan with all
   statuses showing "available".

3. Note: If the MCP server is already installed in Claude Code, the new tools
   will be available immediately (the server re-reads `commands.mjs` on each call).
   If the server needs a restart, inform the user.

4. Proceed to Step 5 (Execute).

**If user chooses (b) — Skip missing**:

1. Remove the missing-tool actions from the plan.
2. Inform the user which actions will be skipped.
3. Proceed to Step 5 (Execute) with the reduced plan.

**If user chooses (c) — Raw automation for gaps**:

1. Mark the missing-tool actions as "raw automation" in the plan.
2. Proceed to Step 5 (Execute), using MCP tools where available and browser
   automation (read_page, computer, find, etc.) for the gaps.

---

## Step 5: Execute the Task

Once planning and gap analysis are resolved, execute the user's request using the
appropriate method:

- **With MCP**: Call the MCP server's tools directly. Chain multiple tool calls
  for complex tasks. The MCP tools handle all the DOM interaction internally.

- **Without MCP** (user chose raw automation): Use the Claude in Chrome browser
  tools (read_page, computer, find, etc.) as usual.

- **Mixed mode** (user chose option c in gap analysis): Use MCP tools for covered
  actions and raw browser automation for the gaps. Clearly indicate in the execution
  trace which method was used for each action.

---

## Step 6: Report to User

When the WebMCP skill activates, ALWAYS report the following to the user:

### 6.1 MCP Discovery Report (at activation)

When the skill first runs, immediately show:

```
WebMCP activated for: <domain>

Catalogue match: <app-name> — <displayName>
MCPs available: <count>
  1. <mcp-name> v<version> — <operationCount> tools, <confidence>% confidence
  2. (additional MCPs if any)

Selected: <mcp-name> (highest confidence)
Status: <installed | not installed — needs setup | downloading from GitHub>
```

### 6.2 Tool Execution Trace (after task completion)

After completing the user's request, show a concise execution trace — one line per
tool call with a summary of the parameters used:

```
Execution trace:
  1. set_page_title(title: "My Portfolio")
  2. insert_text_box(text: "Welcome to my site", style: "heading")
  3. insert_text_box(text: "I am a software engineer...")
  4. insert_button(name: "Contact Me", link: "mailto:me@example.com")
  5. insert_divider()

5 tools called, 0 errors.
```

If any tool call failed, mark it with an error indicator:
```
  3. insert_embed(url: "https://...") ← ERROR: Element not found
```

---

## Important Rules

1. **MCP-first**: Always check the catalogue before touching the browser.
   The whole point of AutoWebMCP is to avoid raw browser automation.

2. **No silent fallback**: If an MCP tool exists for an operation, use it.
   Never substitute raw clicks for a learned operation without telling the user.

3. **Composability**: For complex tasks, break them into a sequence of MCP tool
   calls. For example, "build a landing page" becomes:
   - `set_site_title(...)` + `set_page_title(...)` + `insert_text_box(...)` ×N
   + `insert_button(...)` + `insert_divider(...)` etc.

4. **Coverage gaps**: If the MCP server doesn't have a tool for something the
   user needs, note it and offer to add it via `/learn-webapp` with "add tool".

5. **State awareness**: Some MCP tools depend on state (e.g., `format_text`
   requires text to be selected). Sequence calls appropriately and use
   `get_site_info` or similar query tools to check state when needed.

6. **Multiple MCPs**: The catalogue supports multiple MCPs per application.
   If multiple exist, prefer the one with highest confidence and most operations.
   You can use tools from different MCPs for the same app if they cover different
   capabilities.
