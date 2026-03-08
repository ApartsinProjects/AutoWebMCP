---
name: webmcp
description: >
  Route web application tasks through learned MCP servers instead of raw browser
  automation. ALWAYS use this skill BEFORE interacting with any web application.
  Checks if a matching MCP server exists in the AutoWebMCP catalogue and instructs
  you to use its semantic tools instead of clicking and typing through the browser
  manually.
  Triggers on: any web app interaction, "edit this site", "build a page", "add content",
  "change the theme", "fill this form", "automate this app", "create a site",
  "update the site", or any task involving a web application that may have a learned MCP.
user-invocable: true
argument-hint: [url-or-app-name]
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, mcp__*
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

## Step 0: Ensure Chrome CDP is Available

MCP servers connect to Chrome via the Chrome DevTools Protocol (CDP). Before doing
anything else, verify that a CDP-enabled Chrome instance is running.

### 0.1 Test CDP Connectivity

Try connecting to the CDP endpoint:

```bash
curl -s http://127.0.0.1:9222/json/version
```

If this succeeds (returns JSON with `webSocketDebuggerUrl`), skip to Step 1.

### 0.2 If CDP is NOT Available — Ask User About Browser Mode

If the CDP check fails, ask the user which browser mode to use:

```
Chrome is not running with remote debugging enabled (CDP port 9222).
I need to launch Chrome with --remote-debugging-port=9222.

How would you like to run the browser?

  a) User profile — use your existing Chrome profile with all saved
     credentials, cookies, and logged-in sessions. Best for interacting
     with apps you're already authenticated to.

  b) Sandbox — launch a clean browser with no saved data. You'll need
     to log in to any apps manually. Best for testing or exploring apps
     without touching your personal data.
```

Wait for the user's choice before proceeding.

### 0.3 Launch Chrome with CDP

**CRITICAL**: Chrome requires `--user-data-dir` set to a **non-default** directory
for CDP remote debugging to work. This applies to ALL modes — even "user profile"
mode needs a separate data directory. The default Chrome profile path
(`AppData/Local/Google/Chrome/User Data` on Windows) is considered "default" even
when explicitly passed, and Chrome will refuse to enable CDP with it.

**Solution**: Use a dedicated CDP profile directory. On first use, the user will
need to sign into their apps once in this profile. After that, credentials persist.

#### Find Chrome

```bash
# Windows — check common locations:
#   "C:\Program Files\Google\Chrome\Application\chrome.exe"
#   "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
#   "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
# Use: where chrome 2>nul || ls "/c/Program Files/Google/Chrome/Application/chrome.exe" 2>/dev/null || ls "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" 2>/dev/null
```

#### Kill existing Chrome (if running)

If Chrome is already running, the new instance cannot bind to port 9222.
Ask the user:

```
Chrome is already running. It must be fully closed before I can relaunch
with remote debugging enabled.

Would you like me to kill all Chrome processes now?
  - Yes — I'll terminate all Chrome instances and relaunch
  - No — please close Chrome manually and tell me when ready
```

If the user says **yes**, kill all Chrome processes:

```bash
# Windows (in bash, use double-slash for flags)
taskkill //F //IM chrome.exe //T

# macOS
pkill -f "Google Chrome"

# Linux
pkill -f chrome
```

Wait 2 seconds after killing before launching.

#### Launch based on user's mode choice

**Option (a) — User profile (dedicated CDP directory):**

```bash
# Create the CDP profile directory if it doesn't exist
mkdir -p "<CDP_PROFILE_DIR>"

# Windows
start "" "<path-to-chrome>" --remote-debugging-port=9222 --user-data-dir="<CDP_PROFILE_DIR>" --no-first-run --no-default-browser-check --disable-session-crashed-bubble "<TARGET_URL>"

# macOS
open -a "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir="<CDP_PROFILE_DIR>" --no-first-run --no-default-browser-check --disable-session-crashed-bubble "<TARGET_URL>"

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir="<CDP_PROFILE_DIR>" --no-first-run --no-default-browser-check --disable-session-crashed-bubble "<TARGET_URL>" &
```

Where `<CDP_PROFILE_DIR>` is:
- Windows: `C:/Users/<username>/AppData/Local/Google/Chrome/CDP-Profile`
- macOS: `~/Library/Application Support/Google/Chrome/CDP-Profile`
- Linux: `~/.config/google-chrome/CDP-Profile`

**First-time notice**: If this is a new CDP profile (empty directory), inform the user:
```
This is a fresh Chrome profile for CDP automation. You'll need to sign into
your Google account (or other apps) once in this browser window. After that,
your credentials will persist in this profile for future sessions.
```

**Option (b) — Sandbox:**

```bash
# Windows
start "" "<path-to-chrome>" --remote-debugging-port=9222 --user-data-dir="%TEMP%/chrome-sandbox-%RANDOM%" --no-first-run --no-default-browser-check --disable-session-crashed-bubble "<TARGET_URL>"

# macOS
open -a "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir="/tmp/chrome-sandbox-$$" --no-first-run --no-default-browser-check

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome-sandbox-$$" --no-first-run --no-default-browser-check &
```

After launching, wait 3 seconds, then re-test the CDP endpoint. If it still
fails, inform the user and stop.

### 0.4 Set Environment Variables

Based on the user's choice, remember the mode for MCP server config:

- **Option (a)**: `BROWSER_MODE=visible`, `DATA_MODE=user`
- **Option (b)**: `BROWSER_MODE=visible`, `DATA_MODE=sandbox`

These values are used when registering MCP servers in `.mcp.json`.

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

If no match is found locally, try fetching the catalogue from GitHub. Read the
`repository` field from the **local** `catalogue.json` to determine the GitHub repo:

```bash
# Read the repo name dynamically from catalogue.json
REPO=$(node -e "console.log(JSON.parse(require('fs').readFileSync('<PROJECT_ROOT>/catalogue.json','utf-8')).repository)")
gh api "repos/$REPO/contents/catalogue.json" -q .content | node -e "process.stdin.on('data',d=>process.stdout.write(Buffer.from(d.toString().trim(),'base64')))"
```

If `gh` is not installed, skip the remote check entirely.

If there is no local `catalogue.json` or no `repository` field, skip the remote check.

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
   Read the `repository` field from `catalogue.json` to get the GitHub repo name,
   then download:
   ```bash
   # Read repo name from catalogue.json
   REPO=$(node -e "console.log(JSON.parse(require('fs').readFileSync('<PROJECT_ROOT>/catalogue.json','utf-8')).repository)")

   # Create local directory
   mkdir -p "<PROJECT_ROOT>/<mcp.path>"

   # Download server files from GitHub
   cd "<PROJECT_ROOT>/<mcp.path>"
   gh api "repos/$REPO/contents/<mcp.path>" \
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
   Read `<PROJECT_ROOT>/.mcp.json` (project-level MCP config for Claude Code).
   Look for a `"mcpServers"` entry matching the app name.

7. **If NOT installed — auto-install into `.mcp.json`**:

   a. Read `<PROJECT_ROOT>/.mcp.json` (create it if it doesn't exist).

   b. Add the MCP server entry automatically — do NOT ask the user, just do it:

      ```json
      {
        "mcpServers": {
          "<app-name>": {
            "type": "stdio",
            "command": "node",
            "args": ["<mcp.path>/index.mjs"],
            "env": {
              "CHROME_CDP_URL": "http://127.0.0.1:9222",
              "BROWSER_MODE": "visible",
              "DATA_MODE": "user"
            }
          }
        }
      }
      ```

      Use a **relative path** in `args` (e.g., `MCPs/google-sites/server/index.mjs`),
      not an absolute path — this keeps `.mcp.json` portable across machines.

      If `.mcp.json` already has other servers, merge the new entry into the
      existing `mcpServers` object without removing existing entries.

   c. Inform the user and **stop execution**:

      ```
      MCP server "<app-name>" has been registered in .mcp.json.

      To activate the MCP tools, please restart Claude Code (Ctrl+C, then
      re-run `claude`). After restart, re-run your request and the MCP
      tools will be used automatically — no raw browser automation needed.
      ```

   d. Do NOT proceed with raw browser automation. Do NOT attempt to use the
      MCP tools before restart. The whole point is to ensure the MCP tools
      are properly loaded before any work begins.

8. **If installed and running**: Proceed with the user's task using ONLY the MCP
   server's tools. Read the manifest to discover available tools, then map the
   user's natural language request to the appropriate tool calls.

   Generic mapping pattern — match user intent to MCP tool names:

   | User intent                           | Look for tool like...                    |
   |---------------------------------------|------------------------------------------|
   | "Set/change/update X to Y"            | `set_X({ value: "Y" })`                |
   | "Add/insert/create X"                 | `insert_X(...)` or `create_X(...)`      |
   | "Delete/remove X"                     | `delete_X(...)` or `remove_X(...)`      |
   | "Search/find X"                       | `search({ query: "X" })`               |
   | "List/show all X"                     | `list_X()` or `get_X()`                |
   | "Send/submit X"                       | `send_X(...)` or `submit_X(...)`        |
   | "Undo that"                           | `undo()`                                 |
   | "Show me the scripts"                 | `show_scripts()`                         |

   Always check `show_scripts()` or the manifest to see the **actual** tool names
   available for the specific app — tool names are app-specific and vary by MCP.

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

**Simple-request shortcut**: If the user's request maps to a **single MCP tool call**
(e.g., "set the title to X"), skip the plan table — just execute the tool directly
and report the result. The full plan table is only needed for multi-step requests
(2+ actions).

### 4.1 Create Execution Plan

For multi-step requests, break the user's request into a sequence of discrete
actions. For each action, determine which MCP tool would handle it. Present the
plan to the user:

```
Execution plan for: "<user's request summary>"

| # | Action                          | MCP Tool              | Status    |
|---|---------------------------------|-----------------------|-----------|
| 1 | <action description>            | <matched_tool_name>   | available |
| 2 | <action description>            | <matched_tool_name>   | available |
| 3 | <action description>            | —                     | MISSING   |
| 4 | <action description>            | <matched_tool_name>   | available |
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

1. For each missing tool, follow the learn-webapp Phase 7 (Manual Tool Addition)
   workflow directly — do NOT invoke `/learn-webapp` as a separate skill; instead
   execute Phase 7's steps inline:
   a. Navigate to the app in the browser (if not already there)
   b. Explore: locate the UI elements needed for the missing operation
   c. Define the operation (name, description, parameters, procedure, selectors)
   d. Validate: execute the procedure at least once to confirm it works
   e. Append the new function to `<PROJECT_ROOT>/MCPs/<APP_NAME>/server/commands.mjs`
   f. Add the new tool registration to `<PROJECT_ROOT>/MCPs/<APP_NAME>/server/index.mjs`
   g. Update `manifest.json` (add operation, increment count)
   h. Update `exploration/log.json` (add exploration entries and inferred operation)
   i. Update `catalogue.json` (bump `operationCount`)

2. After all missing tools are learned, re-display the execution plan with all
   statuses showing "available".

3. **IMPORTANT**: After modifying `commands.mjs` and `index.mjs`, the MCP server
   process must be **restarted** for changes to take effect. Inform the user:
   "New tools added. Please restart Claude Code (or restart the MCP server)
   for the new tools to become available, then I'll continue with your request."

4. After restart confirmation, proceed to Step 5 (Execute).

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
  1. tool_a(param: "value")
  2. tool_b(param: "value")
  3. tool_c(param1: "x", param2: "y")

3 tools called, 0 errors.
```

If any tool call failed, mark it with an error indicator:
```
  2. tool_b(param: "value") ← ERROR: Element not found
```

---

## Important Rules

1. **MCP-first**: Always check the catalogue before touching the browser.
   The whole point of AutoWebMCP is to avoid raw browser automation.

2. **No silent fallback**: If an MCP tool exists for an operation, use it.
   Never substitute raw clicks for a learned operation without telling the user.

3. **Composability**: For complex tasks, break them into a sequence of MCP tool
   calls. Check available tools via `show_scripts()` or the manifest, then chain
   the appropriate calls in order. For example, a multi-step task becomes:
   - `tool_A(...)` + `tool_B(...)` + `tool_C(...)` etc.

4. **Coverage gaps**: If the MCP server doesn't have a tool for something the
   user needs, note it and offer to learn it (follow Step 4.3(a) inline workflow).

5. **State awareness**: Some MCP tools depend on state (e.g., a formatting tool
   may require text to be selected first). Sequence calls appropriately and use
   query/info tools from the MCP to check state when needed.

6. **Multiple MCPs**: The catalogue supports multiple MCPs per application.
   If multiple exist, prefer the one with highest confidence and most operations.
   You can use tools from different MCPs for the same app if they cover different
   capabilities.

7. **Error recovery**: If an MCP tool call fails:
   - **Selector not found**: The app's UI may have changed. Report the error and
     offer to re-learn the operation (follow Step 4.3(a) inline workflow).
   - **Page not loaded**: Verify the app is open in Chrome and the URL matches.
     Navigate to the correct URL and retry once.
   - **CDP connection error**: Check that Chrome is running with
     `--remote-debugging-port=9222`. Report the error.
   - **Timeout**: The page may be slow. Retry once with a longer timeout. If it
     fails again, report the error.
   - Never retry more than once. After one retry failure, stop and report.

8. **Systematic error tracking & MCP update proposals**: Track errors across the
   entire execution of the user's task. After the task completes (or is blocked),
   analyze the error pattern and propose MCP updates if warranted.

   **Error tracking**: During execution, maintain a mental log of every tool error:
   ```
   errors: [
     { tool: "tool_name", error: "error message", category: "selector|timeout|cdp|state" }
   ]
   ```

   **After task execution**, if there were errors, add an **Error Analysis** section
   to the execution trace (Step 6.2):

   ```
   Execution trace:
     1. tool_a(param: "value") ✓
     2. tool_b(param: "value") ← ERROR: Element not found
     3. tool_c(param: "value") ✓
     4. tool_d(param: "value") ← ERROR: Timeout waiting for element

   4 tools called, 2 errors.

   Error analysis:
     - tool_b: Selector not found — the app's UI may have changed for this element
     - tool_d: Timeout — element may have been redesigned or moved

   ⚠ 2 of 4 tools failed. I recommend updating the MCP server to fix these tools.
   ```

   **Propose MCP update when**:
   - **2+ tools fail** during a single task execution
   - **The same tool fails consistently** (fails on retry too)
   - **Errors suggest UI changes** (selector not found, element structure changed)
   - **Critical tools fail** (tools central to the user's workflow)

   **How to propose**:
   ```
   Some MCP tools encountered errors that suggest the app's UI may have changed
   since the MCP was last learned.

   Failed tools:
     - tool_b: <error description>
     - tool_d: <error description>

   Would you like me to:
     a) Fix these tools now — I'll explore the app, find the updated selectors,
        and patch the MCP server (requires restart after)
     b) Re-validate all tools — run a full validation pass on every tool in the
        MCP to find all broken ones at once (/learn-webapp <url> → option c)
     c) Skip for now — continue without these tools
   ```

   **If user chooses (a)**: For each failed tool, follow the Step 4.3(a) inline
   learning workflow — explore the app, find the correct selectors, update
   `commands.mjs`, `index.mjs`, and `manifest.json`. After fixing, inform the user
   to restart Claude Code.

   **If user chooses (b)**: Suggest running `/learn-webapp <url>` and choosing
   option (c) "Validate & fix" from the re-learning menu.

   **If user chooses (c)**: Note the broken tools in the execution report and move on.

   **Single-error handling**: If only 1 tool fails and it's not blocking the user's
   task, just report it in the execution trace — no need to propose a full MCP update.
   But if that 1 tool failure blocks task completion, propose fix option (a) immediately.
