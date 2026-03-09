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
# Windows (bash) — detect Chrome path in priority order:
# $LOCALAPPDATA is inherited from Windows and works in Claude Code's bash.
# Convert backslashes to forward slashes for path operations.
WIN_APPLOCAL="$(echo "$LOCALAPPDATA" | sed 's/\\\\/\\//g')"
CHROME_PATH=""
for p in \
  "$WIN_APPLOCAL/Google/Chrome/Application/chrome.exe" \
  "/c/Program Files/Google/Chrome/Application/chrome.exe" \
  "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"; do
  if [ -f "$p" ]; then CHROME_PATH="$p"; break; fi
done
echo "Chrome found at: $CHROME_PATH"
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

**Suppress "Restore pages" popup**: After force-killing Chrome, the profile's
`Preferences` file records `exit_type: Crashed`, causing a restore prompt on next
launch. Fix this before relaunching:

```bash
PREFS_FILE="$CDP_PROFILE_DIR/Default/Preferences"
if [ -f "$PREFS_FILE" ]; then
  sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/g' "$PREFS_FILE"
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/g' "$PREFS_FILE"
fi
```

#### Launch based on user's mode choice

**Option (a) — User profile (dedicated CDP directory):**

```bash
# Create the CDP profile directory if it doesn't exist
mkdir -p "<CDP_PROFILE_DIR>"

# Windows — IMPORTANT: Do NOT use `start ""` in Git Bash — it triggers MSYS2
# path conversion which mangles --user-data-dir (e.g., /Google/Chrome/... becomes
# C:/Program Files/Git/Google/Chrome/...). Use direct execution with `&` instead.
"$CHROME_PATH" --remote-debugging-port=9222 --user-data-dir="$CDP_PROFILE_DIR" --no-first-run --no-default-browser-check --disable-session-crashed-bubble --hide-crash-restore-bubble --noerrdialogs "<TARGET_URL>" &

# macOS
"$CHROME_PATH" --remote-debugging-port=9222 --user-data-dir="$CDP_PROFILE_DIR" --no-first-run --no-default-browser-check --disable-session-crashed-bubble --hide-crash-restore-bubble --noerrdialogs "<TARGET_URL>" &

# Linux
"$CHROME_PATH" --remote-debugging-port=9222 --user-data-dir="$CDP_PROFILE_DIR" --no-first-run --no-default-browser-check --disable-session-crashed-bubble --hide-crash-restore-bubble --noerrdialogs "<TARGET_URL>" &
```

Detect `<CDP_PROFILE_DIR>` based on platform:
```bash
# Windows (bash) — use $LOCALAPPDATA (inherited from Windows) with backslash conversion
CDP_PROFILE_DIR="$(echo "$LOCALAPPDATA" | sed 's/\\\\/\\//g')/Google/Chrome/CDP-Profile"

# macOS
CDP_PROFILE_DIR="$HOME/Library/Application Support/Google/Chrome/CDP-Profile"

# Linux
CDP_PROFILE_DIR="$HOME/.config/google-chrome/CDP-Profile"
```

**First-time notice**: If this is a new CDP profile (empty directory), inform the user:
```
This is a fresh Chrome profile for CDP automation. You'll need to sign into
your Google account (or other apps) once in this browser window. After that,
your credentials will persist in this profile for future sessions.
```

**Option (b) — Sandbox:**

```bash
# Windows — use $TEMP (or fallback to /tmp) for sandbox directory.
# Do NOT use `start ""` — MSYS2 path conversion mangles --user-data-dir.
SANDBOX_DIR="${TEMP:-/tmp}/chrome-sandbox-$$"
"$CHROME_PATH" --remote-debugging-port=9222 --user-data-dir="$SANDBOX_DIR" --no-first-run --no-default-browser-check --disable-session-crashed-bubble --hide-crash-restore-bubble --noerrdialogs "<TARGET_URL>" &

# macOS
"$CHROME_PATH" --remote-debugging-port=9222 --user-data-dir="/tmp/chrome-sandbox-$$" --no-first-run --no-default-browser-check &

# Linux
"$CHROME_PATH" --remote-debugging-port=9222 --user-data-dir="/tmp/chrome-sandbox-$$" --no-first-run --no-default-browser-check &
```

After launching, wait 3 seconds, then re-test the CDP endpoint. If it still
fails, inform the user and stop.

### 0.4 Connection Health Probing

**MANDATORY**: Before executing any task, and between major batches of tool
calls, probe the CDP connection to detect early loss of browser connectivity.

**Health check procedure**:
```bash
curl -s --max-time 3 http://127.0.0.1:9222/json/version
```

**When to probe**:
- Before Step 5 (Execute the Task) begins
- Between batches in `run_script` operations (every 3-5 tool calls)
- After any tool call returns an error
- After any `run_script` batch completes (before starting the next)

**If health check fails** (timeout, connection refused, empty response):
1. Stop immediately — do NOT attempt further tool calls
2. Inform the user:
   ```
   Lost connection to Chrome (CDP port 9222 is not responding).
   Chrome may have been closed or crashed.
   Would you like me to relaunch Chrome with CDP?
   ```
3. If yes, follow Step 0.3 launch procedure (kill, fix Preferences, relaunch)
4. After relaunch, re-verify connectivity, then resume from last successful step

**Error signatures to watch for during tool execution**:
- `"Target closed"` — Chrome tab was closed
- `"Session closed"` — CDP session expired
- `"Protocol error"` — CDP connection corrupted
- `ETIMEDOUT` / `ECONNREFUSED` — Chrome process is gone
- Any of these → stop, run health check, recover before continuing

### 0.5 Set Environment Variables

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

   b. Add the MCP server entry automatically — do NOT ask the user, just do it.
      Use the `BROWSER_MODE` and `DATA_MODE` values from Step 0.5 (defaults:
      `visible` and `user`):

      ```json
      {
        "mcpServers": {
          "<app-name>": {
            "type": "stdio",
            "command": "node",
            "args": ["<mcp.path>/index.mjs"],
            "env": {
              "CHROME_CDP_URL": "http://127.0.0.1:9222",
              "BROWSER_MODE": "<from Step 0.5>",
              "DATA_MODE": "<from Step 0.5>"
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

9. **If installed but tools fail**: Use `run_script` as the first fallback —
   it runs arbitrary JS through the same CDP connection. Do NOT fall back to
   the Chrome extension. If `run_script` also fails, suggest:
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
  c) Use raw automation for gaps — use MCP tools where available, use standard
     browser automation (clicking, typing) only for the missing operations
```

### 4.3 Handle User Choice

**If user chooses (a) — Learn missing tools**:

Delegate to the `/learn-webapp` skill. Do NOT perform learning inline — webmcp is
a routing skill, not a learning skill.

1. Inform the user:
   ```
   I'll run /learn-webapp <url> to learn the missing tools.
   After learning, you'll need to restart Claude Code for the new tools
   to become available.
   ```

2. Invoke `/learn-webapp <url>`. The learning skill handles exploration,
   code generation, and MCP file updates (commands.mjs, index.mjs, manifest,
   catalogue). It will present the user with the approval gate and commit option.

3. After learning completes and Claude Code is restarted, re-run the original
   request — the new tools will now be available.

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

Once planning and gap analysis are resolved, execute the user's request.

### 5.1 Performance Strategy — Choose Execution Mode

Every MCP server includes three execution tiers. **Always pick the fastest tier
that fits the task**:

| Tier | Tool | When to use | Speed |
|------|------|-------------|-------|
| **Batch** | `run_script` | Multi-step tasks (3+ actions), bulk content creation, anything with loops | **Instant** — single CDP round-trip |
| **Sequential** | Individual MCP tools | Simple 1-2 step tasks, or when readback between steps matters | Fast — one round-trip per tool |
| **Fallback** | `run_script` with custom DOM logic | When a specific learned tool fails | Instant — bypass broken tool |

**CRITICAL performance rule**: For any task requiring 3+ tool calls, **always use
`run_script`** with a single JavaScript payload instead of calling tools one by one.
Each MCP tool call is a full network round-trip (Claude → stdio → Puppeteer → CDP →
Chrome → back). Batching into `run_script` collapses N round-trips into 1.

### 5.2 Using `run_script` for Batch Operations

The `run_script` tool executes arbitrary JavaScript in the page context via the
MCP server's existing CDP connection. Helper functions from `commands.mjs` are
injected into the page's global scope once by `getPage()` (via `_injectHelpers`
+ `evaluateOnNewDocument`) — zero overhead on every `exec()` and `run_script`
call. Helpers auto-re-inject on page navigation. The CDP connection has a
`protocolTimeout` of 120 seconds, allowing long batch scripts. This works on
all web sites including those with Trusted Types CSP (Google, GitHub, etc.).

**Example — build a Google Form with 5 questions in one call:**
```
run_script({
  script: `
    // All helpers from commands.mjs are available
    const delay = ms => new Promise(r => setTimeout(r, ms));

    // Set title
    await set_form_title({ title: "My Survey" });
    await delay(300);

    // Add questions in a loop
    const questions = [
      { text: "Q1?", type: "multiple choice", options: ["A", "B", "C"] },
      { text: "Q2?", type: "paragraph" },
    ];
    for (const q of questions) {
      await add_question({ text: q.text, type: q.type });
      await delay(300);
      if (q.options) {
        for (const opt of q.options) {
          await add_option({ text: opt });
          await delay(200);
        }
      }
    }
    return { success: true, questionsAdded: questions.length };
  `
})
```

**When `run_script` is better than individual tools:**
- Building forms, pages, or documents with multiple sections/items
- Applying the same operation to many elements (bulk rename, bulk format)
- Complex workflows with conditional logic between steps
- When individual tools fail due to focus/timing issues — `run_script` can
  use DOM APIs directly to work around the problem

### 5.3 Batch Validation (MANDATORY after every batch)

After every `run_script` batch or sequence of 3+ individual tool calls, validate
that the desired results actually took effect. Do NOT assume success from return
values alone — verify against the actual DOM/HTML state.

**Validation procedure**:

1. **DOM readback** (preferred): Use `run_script` to read back the state of
   elements that were just modified. Compare against expected values.

   ```
   run_script({
     script: `
       // After building a form with 3 questions, verify:
       const questions = document.querySelectorAll('[data-item-id]');
       const title = document.querySelector('[aria-label="Form title"]')?.value;
       const optionInputs = document.querySelectorAll('input[aria-label="option value"]');
       const optionValues = [...optionInputs].map(i => i.value);
       return {
         questionCount: questions.length,
         title: title,
         options: optionValues
       };
     `
   })
   ```

2. **Accessibility tree** (when DOM selectors are complex): Use `read_page` or
   the MCP's query tools (e.g., `get_form_info`, `get_site_info`) to check
   the current state.

3. **Screenshot** (when visual confirmation is needed): Take a screenshot if:
   - The change is visual-only (theme color, layout, formatting)
   - DOM readback returns ambiguous results
   - Multiple operations were batched and you need an overview

**What to validate after common sequences**:

| Sequence | Validation |
|----------|-----------|
| Set title/name/text | Read back the element's value — must match |
| Add N items (questions, options, rows) | Count items — must equal expected N |
| Delete items | Count items — must have decreased |
| Set theme/color | Screenshot to confirm visual change |
| Toggle settings | Read back the toggle state |
| Multi-step form build | Count all elements + read back text content |

**If validation fails**:
1. Identify which specific step didn't take effect
2. Re-execute just that step (not the entire batch)
3. Re-validate after the fix
4. If the same step fails twice, fall back to individual tool calls with
   DOM verification after each one

**Example — build 3 questions then validate**:
```
// Step 1: Execute batch
run_script({ script: `
  for (const q of questions) {
    await add_question({ text: q.text, type: q.type });
    await delay(300);
    // ... add options
  }
  return { added: questions.length };
`})

// Step 2: Validate (separate call)
run_script({ script: `
  const cards = document.querySelectorAll('[data-item-id]');
  const texts = [...cards].map(c => {
    const input = c.querySelector('[aria-label="Question"]') ||
                  c.querySelector('textarea');
    return input?.value || input?.textContent || '(empty)';
  });
  return { count: cards.length, texts };
`})
// Compare returned texts against expected question texts
```

### 5.4 Using Individual MCP Tools

For simple 1-2 step tasks, call MCP tools directly:
- `set_page_title({ title: "New Title" })`
- `health_check()`

### 5.5 Handling Tool Failures

If a specific MCP tool fails, **do NOT fall back to the Chrome extension**.
Instead:

1. **First try**: Use `run_script` to call the same function with custom logic
2. **Second try**: Use `run_script` with raw DOM manipulation as a workaround
3. **Last resort**: Report the error and suggest re-learning via `/learn-webapp`

**Never use Chrome extension tools** (computer, read_page, find, screenshot) for
operations that can go through the MCP's CDP connection. The Chrome extension adds
an unnecessary intermediary — all browser interaction should flow through the MCP
server's Puppeteer connection.

### 5.6 Without MCP (no catalogue match)

If no MCP server exists and the user chose raw automation, use browser tools as
a last resort. But always offer to learn the app first.

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

3. **Skill file immutability**: NEVER modify any skill files during execution.
   The following are read-only at runtime:
   - `.claude/skills/learn-webapp/SKILL.md` and `exploration-guide.md`
   - `.claude/skills/webmcp/SKILL.md`
   - `skills/learn-webapp/SKILL.md` and `exploration-guide.md`
   - `skills/webmcp/SKILL.md`

   Only MCP output files may be modified: `MCPs/*/`, `catalogue.json`, `.mcp.json`.

4. **Composability**: For complex tasks, break them into a sequence of MCP tool
   calls. Check available tools via `show_scripts()` or the manifest, then chain
   the appropriate calls in order. For example, a multi-step task becomes:
   - `tool_A(...)` + `tool_B(...)` + `tool_C(...)` etc.

5. **Coverage gaps**: If the MCP server doesn't have a tool for something the
   user needs, note it and offer to learn it by invoking `/learn-webapp`.

6. **State awareness**: Some MCP tools depend on state (e.g., a formatting tool
   may require text to be selected first). Sequence calls appropriately and use
   query/info tools from the MCP to check state when needed.

7. **Multiple MCPs**: The catalogue supports multiple MCPs per application.
   If multiple exist, prefer the one with highest confidence and most operations.
   You can use tools from different MCPs for the same app if they cover different
   capabilities.

8. **Authentication handling**: If an MCP tool returns `state_error` with a URL
   that looks like a login/auth page (contains `/login`, `/auth`, `/signin`,
   `/oauth`, or is on a different domain than the app), the user's session has
   likely expired. Handle this gracefully:
   - Pause execution immediately
   - Notify the user:
     ```
     The app session has expired — the browser was redirected to a login page.
     Please re-authenticate in the browser window. I'll monitor the page and
     resume once you're signed in.
     ```
   - Monitor the page URL (via `health_check` or direct CDP check) every 5 seconds
     for up to 2 minutes. Once the URL returns to the app's expected domain, take a
     screenshot to confirm authenticated state and resume the task from where it paused
   - If 2 minutes pass, ask the user if they need more time or want to cancel

9. **Error recovery**: If an MCP tool call fails:
   - **Selector not found**: The app's UI may have changed. Report the error and
     offer to re-learn the operation via `/learn-webapp`.
   - **Page not loaded**: Verify the app is open in Chrome and the URL matches.
     Navigate to the correct URL and retry once.
   - **CDP connection error**: Check that Chrome is running with
     `--remote-debugging-port=9222`. Report the error.
   - **Timeout**: The page may be slow. Retry once with a longer timeout. If it
     fails again, report the error.
   - Never retry more than once. After one retry failure, stop and report.

10. **Systematic error tracking & MCP update proposals**: Track errors across the
   entire execution of the user's task. After the task completes (or is blocked),
   analyze the error pattern and propose MCP updates if warranted.

   **Error tracking**: During execution, maintain a mental log of every tool error:
   ```
   errors: [
     { tool: "tool_name", error: "error message", category: "selector_not_found|timeout|state_error|unknown" }
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

   **If user chooses (a)**: Delegate to `/learn-webapp <url>` — the learning skill
   handles exploration, selector updates, and MCP file changes. After fixing,
   the user will need to restart Claude Code.

   **If user chooses (b)**: Suggest running `/learn-webapp <url>` and choosing
   option (c) "Validate & fix" from the re-learning menu.

   **If user chooses (c)**: Note the broken tools in the execution report and move on.

   **Single-error handling**: If only 1 tool fails and it's not blocking the user's
   task, just report it in the execution trace — no need to propose a full MCP update.
   But if that 1 tool failure blocks task completion, propose fix option (a) immediately.
