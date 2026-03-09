---
name: learn-webapp
description: >
  Learn a web application's semantic operations and generate a reusable MCP server.
  Use when the user wants to create an MCP server for a web app, learn a web application,
  derive automation commands from a web app, or build an application-specific tool layer.
  Triggers on: "learn this app", "create MCP server for this site", "learn webapp",
  "derive operations from this app", "automate this web app".
user-invocable: true
argument-hint: <url> [app-name]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, mcp__*
---

# Learn Web Application — MCP Server Derivation Skill

You are the AutoWebMCP learning engine. Your job is to explore a target web application,
infer its semantic operations, and generate a reusable MCP server that exposes those
operations as high-level tools.

## Arguments

- `$0` — URL of the target web application (required)
- `$1` — Application name in kebab-case (optional, inferred from URL if omitted)

Set these variables at the start:
- `TARGET_URL` = `$0`
- `APP_NAME` = `$1` or derive from the URL hostname (e.g., `mail.google.com` → `gmail`)
- `PROJECT_ROOT` = the root directory of the AutoWebMCP project. Resolve by searching
  upward from this skill file for a directory containing `catalogue.json`, or use the
  working directory if it contains `catalogue.json`.

All output goes under: `<PROJECT_ROOT>/MCPs/<APP_NAME>/`

### Status Communication

**MANDATORY**: Keep the user informed of progress throughout every phase. Before each
major action, print a short status line describing what you're about to do. Examples:

- `Checking CDP connectivity on port 9222...`
- `Detecting Chrome installation path...`
- `Chrome found at: C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`
- `Killing Chrome processes and relaunching with CDP...`
- `CDP is live — Chrome 145.0.7632.160`
- `Navigating to https://docs.google.com/forms/u/0/...`
- `Phase 2: Taking accessibility tree snapshot of the page...`
- `Exploring element: "Create new form" button (ref_12)...`
- `Found modal dialog — cataloging 8 new interactive elements...`
- `Phase 4: Inferring operations from 23 explorations...`
- `Generating commands.mjs with 15 learned operations...`

Never run more than 2-3 tool calls without printing a status update. The user should
always know what phase you're in and what's happening.

---

## Phase 0: Ensure Chrome CDP is Available

Before any exploration can begin, verify that Chrome is running with remote debugging
enabled. The learning skill uses Chrome's DevTools Protocol (CDP) to explore the app.

### 0.1 Test CDP Connectivity

```bash
curl -s http://127.0.0.1:9222/json/version
```

If this succeeds (returns JSON with `webSocketDebuggerUrl`), skip to Phase 1.

### 0.2 If CDP is NOT Available — Ask User About Browser Mode

```
Chrome is not running with remote debugging enabled (CDP port 9222).
I need to launch Chrome with --remote-debugging-port=9222 to explore the app.

How would you like to run the browser?

  a) User profile — use your existing Chrome profile with all saved
     credentials, cookies, and logged-in sessions. Best when the app
     requires authentication.

  b) Sandbox — launch a clean browser with no saved data. You'll need
     to log in manually. Best for exploring public apps or testing.
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

**MANDATORY**: You MUST detect Chrome's actual path before attempting to launch it.
Never hardcode a single path — Chrome installs vary across machines.

```bash
# Windows (bash) — detect Chrome path in priority order:
# NOTE: $LOCALAPPDATA works in Claude Code's bash (it inherits Windows env vars).
# Convert backslashes to forward slashes for path operations.
WIN_APPLOCAL="$(echo "$LOCALAPPDATA" | sed 's/\\\\/\\//g')"
CHROME_PATH=""
for p in \
  "$WIN_APPLOCAL/Google/Chrome/Application/chrome.exe" \
  "/c/Program Files/Google/Chrome/Application/chrome.exe" \
  "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"; do
  if [ -f "$p" ]; then CHROME_PATH="$p"; break; fi
done
# Fallback: check Windows registry
if [ -z "$CHROME_PATH" ]; then
  CHROME_PATH=$(reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" //ve 2>/dev/null | grep -oP 'REG_SZ\s+\K.*')
fi
echo "Chrome found at: $CHROME_PATH"
```

```bash
# macOS — Chrome is typically at:
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Linux — use which:
CHROME_PATH=$(which google-chrome || which chromium-browser || which chromium)
```

If Chrome is not found at any location, inform the user:
```
Chrome was not found at any of the standard installation paths.
Please provide the path to your Chrome executable.
```

Store the detected path in `CHROME_PATH` and use it in all subsequent launch commands.

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
# Fix Preferences to prevent "Restore pages" popup (do this for whichever
# CDP_PROFILE_DIR will be used — user profile or sandbox)
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

### 0.4 Remember the Mode

Store the user's choice for later use in Phase 5 (Code Generation) and Phase 6
(`.mcp.json` registration):

- **Option (a)**: `BROWSER_MODE=visible`, `DATA_MODE=user`
- **Option (b)**: `BROWSER_MODE=visible`, `DATA_MODE=sandbox`

These values are used when registering MCP servers in `.mcp.json` (Phase 6.3).

### 0.5 Connection Health Probing

**MANDATORY**: Before every major phase (exploration, code generation, validation, test
task), probe the CDP connection to detect early loss of browser connectivity. Do NOT
attempt long operations without confirming the browser is reachable.

**Health check procedure**:
```bash
curl -s --max-time 3 http://127.0.0.1:9222/json/version
```

If this fails (timeout, connection refused, or empty response):
1. **Stop immediately** — do NOT attempt further CDP operations
2. Inform the user:
   ```
   Lost connection to Chrome (CDP port 9222 is not responding).
   This usually means Chrome was closed or crashed.

   Would you like me to relaunch Chrome with CDP?
   ```
3. If yes, follow the Phase 0.3 launch procedure (kill, fix Preferences, relaunch)
4. After relaunch, re-verify connectivity before resuming

**During long operations** (Phase 3 exploration, Phase 6.1 validation, Phase 6.1.2
test task): if any browser tool call returns "Target closed", "Session closed",
"Protocol error", or times out:
1. Stop the current operation
2. Run the health check above
3. If CDP is still alive but the page/tab is gone, re-navigate to the app
4. If CDP is dead, follow the relaunch procedure
5. Resume from the last successful step, not from the beginning

**Error signatures to watch for**:
- `"Target closed"` — the Chrome tab was closed
- `"Session closed"` — the CDP session expired
- `"Protocol error"` — CDP connection corrupted
- `"Navigation timeout"` — page load hung (usually network issue, not CDP)
- `ETIMEDOUT` / `ECONNREFUSED` — Chrome process is gone

---

## Phase 1: Initialization

1. Parse arguments. If no URL is provided, ask the user for one.
2. Derive `APP_NAME` if not provided.
3. **Check for existing MCP** — Read `<PROJECT_ROOT>/catalogue.json` and check if an
   MCP already exists for this `APP_NAME`. If one exists, present the user with options:

   ```
   An MCP server already exists for <APP_NAME>:
     <mcp-name> v<version> — <operationCount> tools, <confidence>% confidence

   What would you like to do?
     a) Re-learn from scratch — full exploration, generates a new MCP version
     b) Update/extend — keep existing tools, explore the app to add new ones
     c) Validate & update — test each existing tool, fix broken selectors, update confidence
     d) Learn separate MCP — create a new independent MCP with different tools
   ```

   **Wait for the user's choice before proceeding.**

   - **If (a) Re-learn from scratch**: Proceed normally from step 4 onward. The new MCP
     will be added as a new version (bump version, e.g., `1.0.0` → `2.0.0`) alongside
     the old one in the catalogue.
   - **If (b) Update/extend**: Read the existing `manifest.json` to load the current tool
     list. Skip Phase 2–4 initial exploration. Instead, show the user the existing tools
     and ask which new tools they want to add. For each requested tool, follow the Phase 7
     "Manual Tool Addition" workflow. After all new tools are added, update the manifest
     and catalogue (increment `operationCount`, keep same version with bumped patch, e.g.,
     `1.0.0` → `1.1.0`).
   - **If (c) Validate & update**: Read the existing `commands.mjs` and `manifest.json`.
     Navigate to the app. For each existing tool, execute its procedure once to verify it
     still works. Report results:
     - Tools that pass validation: keep as-is, update confidence to match
     - Tools with broken selectors: attempt to find updated selectors via exploration,
       fix in `commands.mjs`, re-validate
     - Tools that are completely broken (UI redesigned): mark for removal or re-learning
     After validation, update `manifest.json` with new confidence scores and
     `generatedAt` date.
   - **If (d) Learn separate MCP**: Proceed normally from step 4, but create the new MCP
     with a different name suffix (e.g., `<APP_NAME>-v2-mcp` or user-chosen name). Both
     MCPs will coexist in the catalogue's `mcps` array. Ask the user for a name to
     distinguish the new MCP.

   If no existing MCP is found, proceed normally.

4. Create the output directory structure:

```
MCPs/<APP_NAME>/
├── exploration/          # Exploration logs and snapshots
│   ├── log.json          # Structured exploration log
│   └── snapshots/        # Screenshots and accessibility snapshots
├── server/               # Generated MCP server
│   ├── index.mjs         # MCP server entry point
│   ├── commands.mjs      # Command library
│   ├── package.json      # Server package
│   └── manifest.json     # Server manifest
└── README.md             # Generated documentation
```

5. Get the browser tab context using `tabs_context_mcp`. Create a new tab if needed using `tabs_create_mcp`.
6. Navigate to `TARGET_URL` in the tab.
7. Wait for the page to load, then take a screenshot and save it as the baseline.

---

## Phase 2: Page Reconnaissance

**Goal**: Build a complete map of the application's UI structure and interactive elements.

### 2.1 Structural Analysis

1. Use `read_page` (with `filter: "interactive"`) to get all interactive elements first.
   This is typically smaller and more useful than the full tree.
2. Use `read_page` (with `filter: "all"`) to get the full accessibility tree.
   - **If the tree exceeds ~300 elements**: Do NOT try to process it all at once.
     Instead, use `read_page` with `ref_id` to read specific regions one at a time
     (e.g., read the navigation bar, then the main content area, then the sidebar).
   - **Skip hidden/collapsed content**: Elements inside inactive tabs, collapsed
     accordions, or hidden panels will appear in the full tree but are not yet
     relevant. Note their existence but don't catalog them until their parent
     region is expanded during exploration.
   - **Use `depth` parameter**: If output is still too large, limit depth to 8-10
     and drill into specific subtrees as needed.
3. Take a screenshot for visual reference.

### 2.2 Region Identification

Analyze the accessibility tree and screenshot to identify distinct UI regions:
- **Navigation**: Top bar, side menu, breadcrumbs
- **Content area**: Main content pane, lists, tables, editors
- **Action bars**: Toolbars, button groups, floating action buttons
- **Forms**: Input groups, fieldsets, dialogs
- **Panels**: Sidebars, drawers, modals

For each region, record:
```json
{
  "id": "region-1",
  "label": "descriptive name",
  "type": "navigation|content|actions|form|panel",
  "elements": ["ref_1", "ref_2"],
  "description": "what this region contains/does"
}
```

### 2.3 Interactive Element Catalog

For each interactive element found in step 2.1, record:
```json
{
  "ref": "ref_X",
  "tag": "button|input|select|link|...",
  "role": "ARIA role",
  "label": "visible text or aria-label",
  "region": "region-id",
  "type": "action|input|navigation|toggle",
  "hypothesizedPurpose": "what this element likely does"
}
```

### 2.3.1 Duplicate Element Detection

During element cataloging, detect when multiple DOM elements match the same selector.
This commonly occurs in card-based UIs (e.g., Google Forms has one set of controls per
question card, but only the active card's controls are visible).

**Procedure**:
1. For each interactive element's primary selector, run `querySelectorAll` and count matches
2. If count > 1, flag the element entry with `"duplicateCount": N`
3. Record whether visibility filtering is needed:
   ```json
   {
     "ref": "ref_X",
     "selector": "[aria-label=\"Delete question\"]",
     "duplicateCount": 5,
     "visibilityFiltered": true,
     "note": "5 matching elements — only the active card's is visible"
   }
   ```
4. During code generation (Phase 5), elements flagged with `visibilityFiltered: true`
   must use `queryVisibleSelector()` instead of `querySelector()` to target the
   active/visible instance

### 2.3.2 ARIA Role and Label Probing

For each interactive element, explicitly check for the presence of semantic attributes.
This determines the selector strategy used during code generation and directly affects
tool confidence scores.

**Procedure**:
1. **Check `role` attribute**: Record the element's ARIA role (or lack thereof)
2. **Check `aria-label`**: Record the aria-label value (or lack thereof)
3. **Check `data-tooltip` / `data-testid`**: Record any data attributes useful as selectors
4. **Classify selector availability**:
   - **Semantic** (high resilience): Element has `aria-label`, `data-testid`, or unique `role`
   - **Structural** (medium resilience): Element is findable by tag + parent role/structure
   - **Text-only** (low resilience): Element has no semantic attributes and can only be
     matched by visible text content (use `findElementByText()` or `findButtonByText()`)

Record the classification in the element catalog:
```json
{
  "ref": "ref_X",
  "selectorClass": "semantic|structural|text-only",
  "bestSelector": "[aria-label=\"Add question\"]",
  "fallbackSelectors": ["[data-tooltip=\"Add question\"]"],
  "note": "text-only elements lower tool confidence by 0.10"
}
```

Elements classified as "text-only" should receive a confidence penalty of -0.10 in
Phase 4 operation inference, since text content is the least stable selector strategy.

### 2.3.3 Obfuscated DOM Detection

Some web applications (Facebook, Gmail, compiled React/Angular apps) use obfuscated
or hashed CSS class names that change on every deployment (e.g., `x1lliihq`, `_a9--`).
These classes are unusable as selectors.

**Detection heuristic**: During element cataloging, check if the majority of elements
have class names that match obfuscation patterns:
- Very short (1-8 chars) alphanumeric strings: `x1abc`, `_a9--`
- Hash-like patterns: `css-1dbjc4n`, `_23df`
- No human-readable words in class names

**If obfuscated DOM is detected**:
1. Flag the app as `"obfuscatedDOM": true` in the exploration log
2. Deprioritize CSS class selectors entirely (score 0 instead of 2)
3. Rely exclusively on:
   - `aria-label`, `role`, `data-testid` (semantic selectors)
   - `findElementByText()` and `findButtonByText()` (text-based matching)
   - `getRepeatingContainers()` (structural discovery for feed content)
   - Structural selectors like `[role="main"] > div > div:first-child`
4. Lower the default confidence for all tools by 0.05 since obfuscated apps
   are inherently harder to automate reliably
5. **Enforce in manifest generation**: When writing `manifest.json`, automatically
   apply the -0.05 penalty to every operation's confidence score. Add
   `"domCharacteristics": { "obfuscatedClasses": true }` to the manifest
6. Inform the user:
   ```
   This app uses obfuscated CSS classes (e.g., compiled React/Angular output).
   CSS-based selectors will not be used. Tools will rely on ARIA attributes
   and text content matching, which may be less precise.
   ```

### 2.3.4 DOM Portal Detection

Some React/Angular apps render interactive elements *outside* their logical parent
containers using "portals" (React.createPortal). For example, Facebook renders the
post composer's `[role="textbox"][contenteditable="true"]` element OUTSIDE the
`[role="dialog"]` container, even though it visually appears inside the dialog.

**Detection**: During exploration, after opening a dialog/panel/overlay:
1. Search for interactive elements WITHIN the dialog using `querySelectorWithin`
2. If expected elements (text inputs, buttons) are NOT found within the dialog,
   search GLOBALLY via `querySelector` or `read_page`
3. If elements are found globally but not within the dialog, flag the app as
   using DOM portals for that component:
   ```json
   {
     "portalDetected": true,
     "component": "post composer",
     "dialogRef": "ref_X",
     "portalledElements": ["[role='textbox'][contenteditable='true']"],
     "note": "Textbox rendered outside dialog via React portal"
   }
   ```

**Impact on code generation**: Operations for portal-using components MUST search
globally (`document.querySelector(...)`) rather than scoping to the dialog
(`dialog.querySelector(...)`). The exploration log entry guides code generation
to use the correct scoping strategy.

### 2.3.5 Click-to-Activate Element Detection

Some interactive elements don't exist in the DOM until their container or
placeholder is clicked. For example, Facebook's post composer textbox only
appears after clicking the "What's on your mind?" placeholder area.

**Detection**: During element cataloging, note elements that:
1. Have placeholder text suggesting interactivity (e.g., "What's on your mind?",
   "Search", "Type a message")
2. Don't have an editable element (input/textarea/contenteditable) visible
   in the accessibility tree
3. Show a new editable element after being clicked

**Procedure**:
1. Identify placeholder/trigger elements by aria-placeholder or placeholder-like text
2. Click the trigger element
3. Re-read the page to find newly appeared elements
4. Record the activation pattern:
   ```json
   {
     "clickToActivate": true,
     "trigger": "[aria-placeholder*='on your mind']",
     "activatedElement": "[role='textbox'][contenteditable='true']",
     "delay": 500,
     "note": "Textbox appears in DOM only after clicking placeholder"
   }
   ```

**Impact on code generation**: Operations that interact with click-to-activate
elements must include the activation step before attempting to find/interact
with the activated element. Pattern:
```javascript
// Click placeholder to activate the textbox
const placeholder = querySelector(['[aria-placeholder*="on your mind"]']);
if (placeholder) placeholder.click();
await sleep(500);
// Now find the activated element
const textbox = querySelector(['[role="textbox"][contenteditable="true"]']);
```

### 2.4 Save Reconnaissance Data

Write the region map and element catalog to `exploration/log.json` as the initial exploration state:

```json
{
  "appName": "<APP_NAME>",
  "url": "<TARGET_URL>",
  "timestamp": "<ISO timestamp>",
  "regions": [...],
  "elements": [...],
  "explorations": [],
  "inferredOperations": []
}
```

---

## Phase 2.5: Overlay & Onboarding Dismissal

**Goal**: Clear any overlays, modals, onboarding tours, cookie banners, or promotional
dialogs that block access to the application's main UI.

Many web apps show first-time overlays (AI assistants, feature tours, cookie consent,
promotional modals, "What's new" dialogs) that block the main UI. These MUST be
dismissed before structured exploration can begin.

### 2.5.1 Detect Overlays

After the initial screenshot and reconnaissance, check for blocking overlays:

1. Look for elements with `[role="dialog"]`, `[role="alertdialog"]`, or common overlay
   patterns (`[class*="modal"]`, `[class*="overlay"]`, `[class*="onboarding"]`,
   `[class*="tour"]`, `[class*="welcome"]`, `[class*="banner"]`)
2. Check if the main content area is visually obscured (overlay z-index covering it)
3. Look for cookie consent banners (`[class*="cookie"]`, `[class*="consent"]`,
   `[class*="gdpr"]`, `#onetrust-banner-sdk`, `.cc-window`)

### 2.5.2 Dismiss Strategy

For each detected overlay, try dismissal in this priority order:

1. **AI assistant overlays**: Many Google apps show Gemini/AI welcome dialogs.
   Look for elements containing "Gemini", "AI", "assistant", "copilot" text
   within dialogs. These typically have a "Close", "Dismiss", or "Not now" button.
   Also check for floating AI assistant buttons that may partially obscure the UI
   (e.g., `[aria-label="Ask Gemini"]` floating widgets).
2. **Close/Dismiss button**: Look for `[aria-label="Close"]`, `[aria-label="Dismiss"]`,
   buttons with text "Close", "Dismiss", "Skip", "Not now", "Maybe later", "Got it",
   "No thanks", "X" icon buttons
3. **Cookie banners**: Click "Reject all", "Decline", or the most privacy-preserving
   option. If only "Accept" is available, click it to proceed
4. **Escape key**: Press Escape — many modals close on Escape
5. **Click outside**: Click on the backdrop/overlay area behind the modal

After each dismissal attempt, take a screenshot to verify the overlay is gone.
If new overlays appear (chained onboarding steps), continue dismissing until the
main UI is fully accessible.

### 2.5.3 Record Overlay Handling

Log dismissed overlays in `exploration/log.json` under a new `overlays` array:
```json
{
  "overlays": [
    {
      "type": "onboarding|cookie|promo|ai-assistant|tour",
      "description": "Gemini AI assistant welcome dialog",
      "dismissMethod": "clicked Close button",
      "selector": "[aria-label=\"Close\"]"
    }
  ]
}
```

This data helps when re-learning or validating — the same overlays may reappear.

---

## Phase 3: Interaction Exploration

**Goal**: Systematically probe interactive elements to understand what they do.

### Strategy

Refer to the companion file `exploration-guide.md` (in the same directory as this skill)
for detailed exploration strategies covering buttons, forms, tables, dropdowns, menus,
CRUD patterns, and async handling.

Work through elements grouped by region. For each region, explore the most
prominent/important elements first. Use this priority order:

1. **Primary actions** — Large buttons, submit buttons, compose/create actions
2. **Form inputs** — Text fields, dropdowns, checkboxes, date pickers
3. **Navigation** — Menu items, tabs, links to sub-views
4. **Secondary actions** — Toolbar buttons, context menus, toggles
5. **Informational** — Tooltips, expandable sections, status indicators

**Parallel exploration**: When the app has multiple independent regions (e.g.,
toolbar and sidebar), consider using the Agent tool to explore regions in parallel
when they don't affect each other's state. This can significantly reduce the
total number of tool calls for complex apps with 30+ interactive elements.

### Exploration Procedure (for each element)

For each element to explore:

1. **Pre-state capture**:
   - Take a screenshot (save to `exploration/snapshots/pre-<ref>.png` conceptually — use the screenshot tool)
   - Read the page snapshot (`read_page`) focusing on the region around the element
   - Note the current URL

2. **Danger-zone check** (BEFORE clicking):
   Classify the element's risk level based on its label, role, and context:

   - **SKIP (never click during exploration)**:
     - Publish, Send, Submit, Post, Share, Pay, Purchase, Checkout buttons
     - "Delete all", "Empty trash", "Clear data" (bulk destructive)
     - External OAuth triggers, "Connect account", "Link service"
   - **SAFE (click freely)**:
     - Tabs, menus, dropdowns, expand/collapse, navigation links
     - Undo, redo, preview, view/read-only actions
     - Theme/color/display settings
   - **CAUTIOUS (click but immediately undo/dismiss)**:
     - Single-item delete, duplicate, add, create (reversible)
     - Settings toggles (can be toggled back)
     - Form field changes (don't submit)

   For SKIP elements: Record them in the exploration log with
   `"skippedReason": "dangerous action — <label>"`. They will be included
   as inferred operations in Phase 4 based on their label and surrounding
   context, without needing to be clicked.

   For CAUTIOUS elements: After clicking, immediately undo or dismiss the
   result. If a confirmation dialog appears, click Cancel/Dismiss.

3. **Execute interaction**:
   - For buttons/links: `computer` tool with `left_click` on the element (use `ref` or coordinates)
   - For inputs: `form_input` to set a test value, or `computer` with `type`
   - For dropdowns: Click to open, read options, click an option
   - For menus: Hover or click to expand, catalog sub-items

   **3b. Trusted click detection (isTrusted)**:
   After clicking via JavaScript (step 3), inspect the post-state for evidence
   that the click was ignored. Symptoms of an `isTrusted` requirement:
   - No DOM changes despite clicking a clearly interactive element
   - Console shows "event.isTrusted is false" or similar security messages
   - Element has visual feedback (hover state) but JS click produces no effect

   **When suspected**:
   1. Re-attempt the same click using the `computer` tool (which performs a
      browser-level CDP click with `isTrusted=true`)
   2. Compare results: if the CDP click succeeds where JS click failed, flag
      this element as requiring trusted clicks
   3. Record in the exploration entry:
      ```json
      {
        "requiresTrustedClick": true,
        "trustedClickEvidence": "JS click produced no DOM change; CDP click opened the menu"
      }
      ```
   4. During code generation (Phase 5), elements flagged with `requiresTrustedClick`
      must use the `__clickCoords` return pattern instead of `el.click()`:
      ```javascript
      const rect = el.getBoundingClientRect();
      return {
        success: true,
        __clickCoords: { x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2) }
      };
      ```
      The MCP server's `exec()` function intercepts `__clickCoords` and performs
      a puppeteer-level `page.mouse.click(x, y)` which the browser treats as trusted.

4. **Post-state capture**:
   - Take a screenshot immediately after the interaction
   - Read the page snapshot again
   - Check for:
     - **New elements** appearing (modals, dropdowns, panels, toast messages)
     - **Removed elements** (closed dialogs, hidden sections)
     - **Changed values** (field updates, counter changes)
     - **URL changes** (navigation occurred)
     - **Network requests** (use `read_network_requests` to check for API calls)
     - **Console messages** (use `read_console_messages` for errors or logs)

5. **Record observation**:
   Add to the `explorations` array in `log.json`:
   ```json
   {
     "id": "exp-N",
     "elementRef": "ref_X",
     "elementLabel": "...",
     "action": "click|type|select|hover",
     "actionDetail": "what exactly was done",
     "preState": { "url": "...", "summary": "..." },
     "postState": { "url": "...", "summary": "..." },
     "changes": {
       "domChanges": "description of what changed",
       "visualChanges": "description of visual diff",
       "urlChanged": true/false,
       "networkRequests": ["..."],
       "newElements": ["..."],
       "errors": ["..."]
     },
     "interpretation": "What this interaction does from a user perspective"
   }
   ```

6. **Reset state**:
   - If the interaction opened a modal/dialog, close it (press Escape or click close button)
   - If the interaction navigated away, navigate back to `TARGET_URL`
   - Verify the page is back to a known state before the next exploration

### Widget Interaction Pattern Classification

After exploring a set of elements, classify each by its interaction pattern.
This classification guides code generation in Phase 5 — each pattern maps to a
specific code template.

| Pattern | Description | Code Pattern |
|---------|-------------|--------------|
| **direct-click** | Single JS click produces the effect | `el.click(); return { success: true }` |
| **trusted-click** | Requires browser-level click (isTrusted) | `return { __clickCoords: {x, y} }` |
| **dropdown-option** | Click opens listbox/menu, then click option | `el.click(); await sleep(300); optionEl.click()` |
| **focus-type** | Focus element, then type via setInputValue | `el.focus(); setInputValue(el, value)` |
| **contenteditable** | Focus contentEditable div, selectAll, insertText | `setContentEditableValue(el, value)` |
| **hover-reveal** | Hover to reveal hidden UI, then interact | `return { __hoverCoords: {x,y}, __followUp: "..." }` |
| **click-to-activate** | Click placeholder to make element appear, then interact | `placeholder.click(); await sleep(500); textbox = querySelector(...)` |
| **multi-step-cascade** | Click triggers panel/dialog, interact within, confirm | `clickAndWait(trigger, panel); fillFields(); confirmBtn.click()` |
| **toggle** | Click toggles state; read back aria-checked | `el.click(); return { state: el.getAttribute('aria-checked') }` |

Record the classification for each element in the exploration log:
```json
{
  "elementRef": "ref_X",
  "interactionPattern": "dropdown-option",
  "patternNote": "Click opens question type listbox, then click the desired option"
}
```

During Phase 5 code generation, use the appropriate code pattern for each element
based on its classification. The `trusted-click` pattern is especially important —
these elements MUST use `__clickCoords` or the generated tool will silently fail.

### Editor Framework Detection

During exploration, detect which rich text editor framework the app uses.
Different editors require different input strategies and readback approaches.

**Detection procedure**: For each contenteditable element found, run:
```javascript
// Check for editor framework markers
const markers = {
  lexical: !!el.querySelector('[data-lexical-editor]') || !!el.closest('[data-lexical-editor]'),
  proseMirror: !!el.querySelector('.ProseMirror') || el.classList?.contains('ProseMirror'),
  quill: !!el.querySelector('.ql-editor') || el.classList?.contains('ql-editor'),
  tinyMCE: !!el.querySelector('.tox-edit-area') || !!document.querySelector('.tox-tinymce'),
  draft: !!el.querySelector('[data-editor]') || !!el.closest('[data-contents="true"]'),
};
```

Record the detected framework in the exploration log:
```json
{
  "editorFramework": "lexical|proseMirror|quill|tinyMCE|draft|unknown",
  "inputStrategy": "setContentEditableValue with 300ms readback delay",
  "readbackMethod": "extractTextContent() — handles Lexical data-lexical-text spans"
}
```

**Framework-specific notes**:
- **Lexical** (Facebook): Text stored in `<span data-lexical-text="true">` elements.
  `insertText` works but readback via `textContent` may be delayed. Use
  `extractTextContent()` with the element for reliable readback.
- **ProseMirror** (Google Docs, Notion): Uses transaction-based updates. `insertText`
  works for simple text but may not trigger ProseMirror's update cycle for complex ops.
- **Quill**: Standard contentEditable; `setContentEditableValue()` works reliably.
- **Unknown**: Default to `setContentEditableValue()` with `sleep(300)` + readback.

### Hover Interaction Exploration

Some interactive elements reveal additional UI only when hovered for a duration.
Common examples: Facebook's reaction bar (hover Like for 2s), tooltip menus,
hover-activated dropdowns, and action buttons that appear on card hover.

**During Phase 3 exploration**:
1. For elements with engagement-related labels (Like, React, Vote, Rate, Star),
   try hovering for 2 seconds using the `computer` tool with `hover` action
2. After hovering, take a screenshot and `read_page` to detect new elements
3. If new elements appeared (reaction picker, tooltip menu, action bar):
   - Record the hover trigger, delay, and revealed elements
   - Classify the interaction as `hover-reveal` pattern
   - Test if the revealed elements need trusted clicks or can use JS `.click()`
4. Record in the exploration log:
   ```json
   {
     "elementRef": "ref_X",
     "interactionPattern": "hover-reveal",
     "hoverDelay": 2000,
     "revealedElements": ["Love", "Care", "Haha", "Wow", "Sad", "Angry"],
     "codePattern": "__hoverCoords + __followUp"
   }
   ```

**Impact on code generation**: Hover-reveal operations MUST use the `__hoverCoords`
+ `__followUp` exec() signal pattern. The command returns coordinates for the hover
target, and a `__followUp` function string that inspects the revealed UI and performs
the desired action after the hover delay.

### Multi-step Workflow Discovery

After exploring individual elements, look for multi-step workflows:

1. Identify elements whose interactions lead to new UI states (modals, forms, panels)
2. Explore the NEW elements within those states
3. Trace the full workflow: trigger → fill/interact → confirm/submit → result
4. Record the complete workflow as a sequence of explorations

### Multi-View App Discovery

Many web apps have multiple distinct views that share a URL pattern but have
completely different UIs (e.g., a homepage/list view vs an editor/detail view,
a dashboard vs settings page, an inbox vs a compose view).

**After completing the initial reconnaissance of the landing page:**

1. **Identify view transitions**: Look for actions that navigate to a fundamentally
   different UI within the same app:
   - Clicking a list item opens an editor/detail view
   - Clicking "Create new" opens a creation wizard
   - Tab/section navigation shows entirely different content

2. **Enumerate views**: Record each distinct view in the exploration log:
   ```json
   {
     "views": [
       {
         "id": "homepage",
         "url": "/forms/u/0/",
         "description": "List of recent forms with template gallery",
         "entryAction": "Navigate to base URL"
       },
       {
         "id": "editor",
         "url": "/forms/d/{id}/edit",
         "description": "Form editing interface with questions, settings, theme",
         "entryAction": "Click a form or create new"
       }
     ]
   }
   ```

3. **Explore each view separately**: Run Phase 2 reconnaissance (regions, elements)
   for each distinct view. This ensures tools are generated for all views, not just
   the landing page.

4. **Tag operations by view**: Each inferred operation should record which view it
   belongs to. This helps generated `commands.mjs` include proper precondition
   checks (e.g., `if (!isEditor()) return { error: "Not in editor" }`).

### Feed & Card-Based Content Discovery

Many apps (Facebook, Twitter/X, Reddit, LinkedIn, news readers) display content
in feed/card patterns without semantic `[role="feed"]` markup. These require
anchor-based discovery using `getRepeatingContainers()`.

**Detection**: If the app's main content area contains repeating similar structures
(posts, cards, items) but no `[role="feed"]` or `[role="list"]` element:
1. Identify a common "anchor" element that exists in every card — typically an
   action button like `[aria-label="Like"]`, `[aria-label="Actions for this post"]`,
   or `[aria-label="Share"]`
2. Use `getRepeatingContainers(anchorSelector, levels, verifySelector)` to walk up
   the DOM from each anchor and find the card container
3. Test with different `levels` values (8-15) until you find the right container depth
4. Use a `verifySelector` to confirm the container — another element that should exist
   in every card (e.g., a Like button + an Actions button in the same container)

**Recommended exploration approach**:
```javascript
// Find post containers by walking up from action buttons
const posts = getRepeatingContainers(
  '[aria-label="Actions for this post"]',  // anchor
  15,                                       // max levels
  '[aria-label="Like"]'                     // verify: must also contain Like button
);
```

Record the discovery parameters in `exploration/log.json`:
```json
{
  "feedPattern": {
    "anchorSelector": "[aria-label=\"Actions for this post\"]",
    "maxLevels": 15,
    "verifySelector": "[aria-label=\"Like\"]",
    "containerCount": 4,
    "note": "No [role='feed'] present. Posts found via anchor-based walk-up."
  }
}
```

### Element Reference Stability

Element references (`ref_X`) from `read_page` become stale when:
- The page layout changes (window resize, responsive breakpoint)
- New content loads (AJAX, tab switch, navigation)
- Modals/overlays appear or disappear

**Rules**:
- After any action that significantly changes the DOM (tab switch, navigation,
  modal open/close, window resize), call `read_page` again before using refs
- Never use refs from a previous view in a different view
- If an element interaction fails with a ref, re-read the page and retry with
  a fresh ref

### Iframe Handling

Many web apps render content inside iframes (e.g., Google Sites editor, embedded
editors, sandboxed widgets). During reconnaissance:

1. Check for iframes: look for `iframe`, `[role="document"]` inside frames
2. If the main content area is inside an iframe, note this — generated commands
   will need to target the iframe's content document, not the top-level page
3. Use `javascript_tool` (Claude in Chrome MCP) to enumerate iframes in the live browser:
   ```javascript
   Array.from(document.querySelectorAll('iframe')).map(f => ({
     src: f.src, id: f.id, name: f.name,
     hasContent: !!f.contentDocument
   }))
   ```
4. Record which elements live inside which iframe in the exploration log
5. Generated `commands.mjs` functions should handle iframe traversal when needed

### Authentication Detection and Monitoring

Before starting exploration, check if the app requires authentication:

1. After navigating to `TARGET_URL`, check for signs of auth redirects:
   - URL changed to a login/OAuth page (different domain or `/login`, `/auth` path)
   - URL contains auth-related path segments: `/login`, `/signin`, `/auth`,
     `/accounts`, `/oauth`, `/sso`, `/checkpoint`
   - URL contains auth-related query params: `?next=`, `?redirect=`, `?return_to=`
   - Page title contains "Log in", "Sign in", "Verify", "Checkpoint"
   - Page contains login form elements (`input[type="password"]`, "Sign in" buttons)
2. If auth is detected and `DATA_MODE` is `"user"` (default):
   - Notify the user clearly:
     ```
     The app requires authentication. Please log in to <APP_NAME> in the
     browser window. I'll monitor the page and continue once you're signed in.
     ```
   - **Monitor the browser** — poll the page URL every 5 seconds (up to 2 minutes)
     to detect when the URL returns to `TARGET_URL` or leaves the login/OAuth path:
     ```javascript
     // Check via page.url() or read_page — wait for URL to match TARGET_URL
     ```
   - Once the URL matches `TARGET_URL` again, take a screenshot to confirm the
     authenticated state and notify the user: "Authentication detected. Continuing."
   - If 2 minutes pass without authentication, ask the user if they need more time
     or want to cancel
3. If auth is detected and `DATA_MODE` is `"sandbox"`:
   - Report that the app requires authentication and sandbox mode cannot proceed
   - Suggest switching to `DATA_MODE=user`
4. **Mid-exploration auth interruption** — if the page URL changes to a login/auth
   page during exploration (session expired, token refresh), pause exploration
   immediately and notify the user:
   ```
   The app session appears to have expired — the browser redirected to a login page.
   Please re-authenticate in the browser. I'll resume exploration once you're signed in.
   ```
   Monitor the browser as in step 2 above. Resume exploration from where it was paused.

### Exploration Budget

- **Element count heuristic**: Scale the exploration budget to the app's complexity:
  - < 15 interactive elements: Explore all. Budget: 20-30 tool calls
  - 15-30 elements: Standard budget. Explore 15-20 elements, 30-60 tool calls
  - 30-50 elements: Extended budget. Explore 20-30 elements, 60-90 tool calls
  - 50+ elements: Focus on primary regions first. Use parallel exploration agents
- Explore at minimum 2-3 complete multi-step workflows
- Stop when you've covered all major regions and primary actions
- Skip purely decorative or repetitive elements (e.g., 50 identical list items — explore 1-2)
- **Parallel exploration**: For apps with 5+ independent regions (e.g., Facebook has
  header bar, sidebar, feed, composer, chat), use the Agent tool to explore 2-3
  independent regions concurrently. Each agent explores its assigned region and
  returns the exploration results. Merge results into `exploration/log.json`.
  Only parallelize regions that don't affect each other's state (e.g., sidebar
  navigation changes the content area, so those are NOT independent).
- **Time budget**: Aim to complete exploration within 30-60 tool calls. If the app
  is very complex, focus on the most important regions first and note unexplored
  areas in the report.

---

## Phase 4: Operation Inference

**Goal**: Derive semantic operations from the exploration data.

### 4.1 Analysis

Review all explorations and identify patterns:

1. **Single-action operations**: One click/input that produces a meaningful result
   - Example: "toggle dark mode", "refresh data", "open settings"

2. **Multi-step operations**: Sequences that form a complete user workflow
   - Example: "compose message" = click compose → fill to/subject/body → click send
   - Example: "create item" = click add → fill form → submit

3. **Parameterized operations**: Actions that take user-provided data
   - Example: "search for X", "set field Y to value Z"

4. **Query operations**: Reading/extracting visible state
   - Example: "get unread count", "list items in view", "read selected item"

### 4.2 Operation Definition

For each inferred operation, define:

```json
{
  "name": "snake_case_name",
  "description": "What this operation does, from the user's perspective",
  "category": "navigation|data_entry|content_editing|messaging|workflow|data_retrieval",
  "parameters": {
    "param_name": {
      "type": "string|number|boolean",
      "description": "What this parameter controls",
      "required": true/false
    }
  },
  "returns": {
    "description": "What the operation returns",
    "schema": { "type": "object", "properties": {...} }
  },
  "procedure": [
    {
      "step": 1,
      "action": "click|type|select|wait|evaluate|read",
      "target": "CSS selector or description",
      "selectors": ["primary selector", "fallback selector 1", "fallback selector 2"],
      "value": "value to type/select (if applicable)",
      "waitFor": "what to wait for after this step",
      "note": "why this step is needed"
    }
  ],
  "preconditions": ["what must be true before this operation"],
  "postconditions": ["what should be true after this operation"],
  "confidence": 0.0-1.0,
  "sourceExplorations": ["exp-1", "exp-5"]
}
```

### 4.3 Procedure Development

For each operation, develop the executable JavaScript procedure:

1. Write a JavaScript async function that executes the operation in the page context
2. Use robust selectors — for each target element, provide:
   - Primary: `[data-testid="..."]` or `#id` (most stable)
   - Fallback 1: `[aria-label="..."]` or `[role="..."]` (accessible)
   - Fallback 2: CSS class or structural selector (least stable)
3. Include waits for async UI updates (`MutationObserver` or polling)
4. Return structured results

   **Selector Priority Scoring**:
   When generating fallback selector arrays, order selectors by resilience score
   (highest first). This ensures the most stable selector is tried first.

   | Score | Selector Type | Example |
   |-------|---------------|---------|
   | 5 | `aria-label` | `[aria-label="Add question"]` |
   | 5 | `data-testid` | `[data-testid="compose-btn"]` |
   | 4 | `data-tooltip` / `data-action` | `[data-tooltip="Add question"]` |
   | 3 | `role` + text match | `findElementByText("button", "Add")` |
   | 3 | `role` + `aria-label` combo | `[role="tab"][aria-label="Settings"]` |
   | 2 | CSS class (stable) | `.compose-button` |
   | 1 | Text-only match | `findButtonByText("Insert")` |
   | 0 | Positional / index | `querySelectorAll('input')[2]` |

   Generated selector arrays MUST be ordered highest-score-first:
   ```javascript
   // CORRECT — score-ordered (most resilient first)
   const btn = querySelector([
     '[aria-label="Add question"]',   // score 5
     '[data-tooltip="Add question"]', // score 4
     'button.add-question',           // score 2
   ]);

   // WRONG — fragile selector first
   const btn = querySelector([
     'button.add-question',           // score 2 — breaks on class rename
     '[aria-label="Add question"]',   // score 5 — should be first
   ]);
   ```

Example procedure function:
```javascript
async function compose_message({ to, subject, body }) {
  // Step 1: Click compose button
  const composeBtn = document.querySelector('[data-action="compose"], [aria-label="Compose"], .compose-btn');
  if (!composeBtn) throw new Error('Compose button not found');
  composeBtn.click();

  // Step 2: Wait for compose dialog
  await waitForElement('[role="dialog"], .compose-dialog', 3000);

  // Step 3: Fill recipient
  const toField = document.querySelector('input[name="to"], [aria-label="To"]');
  setInputValue(toField, to);

  // Step 4: Fill subject
  if (subject) {
    const subjectField = document.querySelector('input[name="subject"], [aria-label="Subject"]');
    setInputValue(subjectField, subject);
  }

  // Step 5: Fill body
  const bodyField = document.querySelector('[role="textbox"], [contenteditable="true"], textarea[name="body"]');
  if (bodyField.contentEditable === 'true') {
    bodyField.innerHTML = body;
  } else {
    setInputValue(bodyField, body);
  }

  return { success: true, message: 'Message composed and ready to send' };
}
```

### 4.4 Validation

For each operation with confidence < 0.9, re-test:
1. Navigate to the app
2. Execute the procedure through the browser
3. Verify the postconditions
4. Adjust selectors or steps if needed
5. Update confidence score

Add validated operations to `inferredOperations` in `log.json`.

### 4.4.1 App-Specific Helper Extraction

Before presenting tools to the user, identify recurring code patterns across the
inferred operations and extract them as named helper functions. This reduces code
duplication and makes maintenance easier.

**Procedure**:
1. **Scan for repetition**: Review all inferred operation procedures. Look for:
   - The same selector lookup appearing in 3+ operations
   - The same multi-step sequence (e.g., "click tab X, wait for panel") repeated
   - Common scoping patterns (e.g., "find the active card, then query within it")

2. **Extract helpers**: For each repeated pattern, define an exported helper:
   ```javascript
   // Example: repeated across 8 operations in Google Forms
   export function getActiveQuestionCard() {
     const cards = document.querySelectorAll('[data-item-id]');
     for (const card of cards) {
       const textbox = card.querySelector('[aria-label="Question"]');
       if (textbox && textbox.offsetParent !== null) return card;
     }
     return null;
   }

   // Example: repeated sidebar interaction in Google Sites
   export function clickSidebarTab(tabName) {
     const tabs = document.querySelectorAll('[role="tab"]');
     for (const tab of tabs) {
       if (tab.textContent.trim() === tabName) { tab.click(); return true; }
     }
     return false;
   }
   ```

3. **Place helpers in a dedicated section**: In generated `commands.mjs`, place
   app-specific helpers between the framework utilities and the learned operations:
   ```
   // --- Utility Functions (framework) ---
   // querySelector, waitForElement, queryVisibleSelector, etc.

   // --- App-Specific Helpers (ALL MUST BE EXPORTED) ---
   // getActiveQuestionCard, isHomepage, isEditor, clickSidebarTab, etc.

   // --- Learned Operations ---
   // set_form_title, add_question, etc.
   ```

4. **Refactor operations**: Update operation procedures to call the extracted helpers
   instead of inlining the repeated code.

---

## Phase 4.5: User Approval Gate

**MANDATORY** — Do NOT proceed to code generation until the user explicitly approves the
tool list. This phase loops until the user says the list is ready.

### 4.5.1 Present the Learned Tools

Display a numbered table of all inferred operations:

```
## Proposed tools for <APP_NAME> MCP server

| # | Tool Name            | Description                                      |
|---|----------------------|--------------------------------------------------|
| 1 | <tool_name>          | <what this tool does>                             |
| 2 | <tool_name>          | <what this tool does>                             |
| ...                                                                        |
```

Then ask the user:

> **Does this tool list look good, or would you like to adjust it?**
>
> You can:
> - **Approve** — proceed to generate the MCP server with these tools
> - **Remove tools** — tell me which tools to exclude (by number or name)
> - **Add a tool** — describe a missing operation and I'll explore the app to learn it
>
> Example: *"Remove 3 and 7, and add a tool for duplicating a page"*

### 4.5.2 Handle User Feedback

**If the user removes tools**: Delete the listed operations from the `inferredOperations`
array and re-display the updated table. Ask again.

**If the user requests a new tool**: Follow the Phase 7 "Manual Tool Addition" workflow —
explore the app to learn the requested operation, define it, validate it, and add it to
`inferredOperations`. Then re-display the full updated table. Ask again.

**If the user approves**: Immediately checkpoint the approved operations before
proceeding to Phase 5. Write the complete `inferredOperations` array (with all
procedure definitions) to `exploration/log.json`. This ensures that if the
session runs out of context during code generation, a future session can resume
from the checkpoint without re-exploring the app.

Then proceed to Phase 5 (Code Generation).

### 4.5.3 Loop

Repeat steps 4.5.1–4.5.2 until the user explicitly approves. Only approval moves
to Phase 5. Never skip this gate or auto-approve.

---

## Phase 5: Code Generation

**Goal**: Generate the MCP server package from the user-approved operations.

### 5.1 Read Templates

Read the following template files:
- `<PROJECT_ROOT>/src/templates/mcp-server-template.mjs`
- `<PROJECT_ROOT>/src/templates/commands-template.mjs`
- `<PROJECT_ROOT>/src/templates/package-template.json`

**Template utilities available** (from `commands-template.mjs`):

| Function | Purpose | When to Use |
|----------|---------|-------------|
| `querySelector(selectors)` | Try multiple CSS selectors, return first match | Default element lookup |
| `querySelectorAll(selectors)` | Try multiple selectors, return array | Collecting lists of items |
| `queryVisibleSelector(selectors)` | Like querySelector but only visible matches | Apps with duplicate controls (per-card buttons) |
| `querySelectorWithin(root, selectors)` | Scoped querySelector from a root element | Operating within a card/panel/section |
| `waitForElement(selectors, timeout)` | Wait for element to appear (MutationObserver) | After any click that triggers DOM change |
| `waitForRemoval(selector, timeout)` | Wait for element to disappear | After closing dialogs/overlays |
| `setInputValue(el, value)` | Set value on `<input>`/`<textarea>` | Native form inputs |
| `setContentEditableValue(el, value)` | Set value on contentEditable elements | Rich text fields, titles, descriptions |
| `sleep(ms)` | Pause execution | Animation timing only (never as sole wait) |
| `clickByAriaLabel(label)` | Click element by aria-label | Quick click when aria-label is known |
| `findButtonByText(text)` | Find `<button>` or `[role="button"]` by text | Buttons without aria-labels |
| `findElementByText(role, text, opts)` | Find element by role + text content | Elements without aria-labels |
| `clickMenuItem(itemText)` | Click menu item by text (searches menuitem + button roles) | Menu interactions |
| `findMenuItemByText(text)` | Find menu item element without clicking | When you need __clickCoords for a menu item |
| `extractTextContent(el, opts)` | Extract text from any editor (Lexical, ProseMirror, plain) | Reading back values from rich text editors |
| `retryWithFallback(primary, fallback)` | Try primary action, fallback on failure | Resilient tool implementations |
| `clickAndWait(clickSel, waitSel, timeout)` | Click then wait for result element | Toolbar button → dialog pattern |
| `getPageState()` | Return diagnostic page info | Precondition checks, debugging |
| `navigateTo(url)` | Navigate via `__navigate` signal | In-app page transitions |
| `multiStep(steps)` | Sequential click-and-wait steps | Multi-level menu navigation |
| `getRepeatingContainers(anchor, levels, verify)` | Find feed-style post containers | Feed/card-based apps (Facebook, Reddit) |
| `menuCascade(itemTexts, delay)` | Navigate cascading menus by text | Settings menus, nested dropdowns |
| `selectRadioByIndex(group, index)` | Select radio via trusted click | Radio buttons checking `isTrusted` |
| `togglePanel(trigger, panel, action)` | State-aware panel toggle | Sidebars, settings panels, drawers |

**Template built-in MCP tools** (from `mcp-server-template.mjs`):
- `health_check` — verify browser connectivity
- `get_page_state` — current URL, active element, open dialogs/menus
- `show_scripts` — list all functions in commands.mjs
- `run_script` — execute arbitrary JavaScript in page context

**Template `exec()` enhancements**:
- `__clickCoords` — commands returning `{ __clickCoords: {x,y} }` trigger trusted
  browser-level clicks via puppeteer (for widgets checking `isTrusted`)
- `__hoverCoords` — commands returning `{ __hoverCoords: {x,y} }` move the mouse
  to reveal hover-dependent UI (reaction bars, tooltip menus, hover dropdowns)
- `__keyPress` — commands returning `{ __keyPress: "Enter" }` send keyboard events
  through puppeteer (search submissions, dialog confirmations, Escape to close)
- `__navigate` — commands returning `{ __navigate: url }` perform page navigation
  at the puppeteer level (avoids race condition with `window.location.href`)
- `__followUp` — optional function string to evaluate after a trusted click/hover/key
- Single retry with helper re-injection on failure
- Post-execution URL re-check for in-app navigation
- Session expiry detection — if post-execution URL matches auth patterns
  (`/login`, `/signin`, `/auth`, `/checkpoint`), returns `state_error` with
  `session_expired` hint instead of a cryptic selector failure
- `--smoke-test` CLI flag — run `node index.mjs --smoke-test` to verify
  connectivity and helper injection without starting the MCP server

### 5.2 Generate Command Library

Create `MCPs/<APP_NAME>/server/commands.mjs`:

**CRITICAL**: Every function in `commands.mjs` MUST be exported — both utility/helper
functions and learned operations. The `exec()` function in `index.mjs` dynamically
collects ALL exports and injects them into the browser context. If a helper is NOT
exported, it will be undefined when called inside `page.evaluate()` and the tool will
fail with `"<functionName> is not defined"`.

```javascript
// Auto-generated command library for <APP_NAME>
// Generated by AutoWebMCP learn-webapp skill
// Target: <TARGET_URL>
// Date: <timestamp>

// --- Utility Functions (ALL MUST BE EXPORTED) ---

export function querySelector(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export function waitForElement(selectors, timeout = 5000) {
  // ... polling-based wait
}

export function setInputValue(el, value) {
  el.focus();
  el.select();
  document.execCommand('insertText', false, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// --- App-Specific Helpers (ALL MUST BE EXPORTED) ---
// Any helper function used by learned operations must also be exported.
// Examples: clickSidebarTab, findButtonByText, clickMenuItem, etc.

export function clickSidebarTab(tabName) {
  // ... app-specific helper
}

// --- Learned Operations (EXPORTED) ---
// Generate one exported async function per inferred operation
// Each function:
//   - Checks preconditions
//   - Executes the procedure steps
//   - Verifies postconditions
//   - Returns structured result

export async function operation_name(params) {
  // ... generated from the procedure definition
}
```

Write the actual implementations based on the inferred operations from Phase 4.

#### 5.2.1 Mandatory: waitForElement() over sleep()

**CRITICAL CODE GENERATION RULE**: Generated `commands.mjs` functions MUST use
`waitForElement()` or `waitForRemoval()` after any click/interaction that triggers
a DOM change. Using `sleep()` as the primary wait strategy is **FORBIDDEN**.

**Correct pattern** — wait for the expected DOM result:
```javascript
export async function add_question({ text }) {
  const addBtn = querySelector(['[aria-label="Add question"]']);
  if (!addBtn) return { success: false, error: 'Add question button not found', category: 'selector_not_found' };

  const countBefore = document.querySelectorAll('[data-item-id]').length;
  addBtn.click();

  // CORRECT — wait for the new question card to appear
  await waitForElement(['[data-item-id]'], 5000);
  // Optionally verify count increased
  const countAfter = document.querySelectorAll('[data-item-id]').length;

  if (text) {
    const input = await waitForElement(['[aria-label="Question"]'], 3000);
    input.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  }

  return { success: true };
}
```

**Wrong pattern** — blind sleep:
```javascript
// BAD — fragile timing, breaks on slow connections
addBtn.click();
await sleep(500);  // What if the UI hasn't updated yet?
const input = querySelector(['[aria-label="Question"]']);
```

**Only acceptable uses of sleep()**:
- Animation timing where no DOM change is observable (e.g., `sleep(200)` after
  focus to let a transition complete before typing)
- Debounce delay before readback verification (e.g., `sleep(300)` before reading
  back a contenteditable value that the app auto-saves)
- NEVER more than 500ms, and NEVER as the sole wait strategy after a click

#### 5.2.2 Mandatory: Selector Quality Standards

Generated selectors in `commands.mjs` MUST follow this priority:

1. **`[aria-label="..."]`** — First choice. Most stable, semantic
2. **`[data-testid="..."]`, `[data-*="..."]`** — Excellent stability
3. **`#id`** — Good if the app uses stable IDs (not auto-generated)
4. **`[role="..."]`** — Good for structural elements
5. **`[role="..."][aria-label="..."]`** — Combined for specificity
6. **Tag + attribute** (e.g., `button[type="submit"]`) — Acceptable
7. **Text content match** (via helper like `findButtonByText`) — Acceptable fallback
8. **CSS class** (e.g., `.some-class`) — LAST RESORT ONLY

**NEVER use app-internal CSS classes as primary selectors**. Classes like
`.freebirdFormeditorViewHeaderHeader` or `.docs-title-input` are implementation
details that change without notice. They may only appear as the LAST fallback
in a selector array, after at least one semantic selector.

**After generating all commands**, perform a self-audit:
- Search the generated `commands.mjs` for any class-based selectors
- For each one, check if an `aria-label`, `role`, or `data-*` alternative exists
- Replace class-based selectors with semantic ones wherever possible
- If no semantic selector exists, keep the class selector but lower the tool's
  confidence score by 0.10

**Why everything must be exported**: The `_injectHelpers()` function in `index.mjs`
uses `Object.entries(commands).filter(...)` to collect all function exports at startup
and injects them into the page's global scope via CDP once per page. Any function —
utility or app-specific — is automatically available in the browser context without
maintaining a hardcoded list. If you forget to export a helper, it won't be in the
injected source and tools that call it will break.

#### 5.2.3 Multi-View State Guards (for multi-view apps)

If the app was identified as having multiple views during Phase 3 (Multi-View App
Discovery), generate view-detection helper functions and precondition guards.

**Step 1 — Generate view detection helpers**:
For each discovered view, generate an exported helper that checks URL pattern or
DOM structure:
```javascript
/**
 * Check if the current page is on the app's homepage/list view.
 */
export function isHomepage() {
  return /\/forms\/u\/\d+\/?$/.test(window.location.pathname);
}

/**
 * Check if the current page is in the editor/detail view.
 */
export function isEditor() {
  return /\/forms\/d\/[^/]+\/edit/.test(window.location.href);
}
```

**Step 2 — Add precondition guards to every learned operation**:
Each operation must check that it's on the correct view before executing:
```javascript
export async function set_form_title({ title }) {
  if (!isEditor()) {
    return {
      success: false,
      error: "Not in form editor",
      category: "state_error",
      hint: "Open a form first"
    };
  }
  // ... operation logic
}
```

**Step 3 — Tag operations by view in manifest.json**:
```json
{ "name": "set_form_title", "view": "editor", "description": "..." }
```

**When to skip**: If the app has only a single view (no URL-based or DOM-based
view transitions were observed during exploration), skip this section.

#### 5.2.4 Mandatory Readback Verification

Every set/update operation MUST include readback verification code. After setting
a value, read the element's actual state and compare it to the intended value.
This catches silent failures where the function returns `success: true` but the
DOM didn't actually change.

**For `<input>` / `<textarea>` elements**:
```javascript
setInputValue(el, value);
await sleep(300);  // allow debounce
const readback = el.value;
if (readback !== value) {
  return { success: false, error: `Readback mismatch: expected "${value}", got "${readback}"`, category: "state_error" };
}
```

**For contentEditable elements**:
```javascript
setContentEditableValue(el, value);
await sleep(300);
const readback = el.textContent.trim();
if (readback !== value) {
  return { success: false, error: `Readback mismatch: expected "${value}", got "${readback}"`, category: "state_error" };
}
```

**For toggle elements**:
```javascript
el.click();
await sleep(300);
const state = el.getAttribute('aria-checked') === 'true';
return { success: true, state };  // return actual state, not assumed state
```

**For panel/dialog state**:
```javascript
// Verify a panel actually opened after clicking its trigger
trigger.click();
await waitForElement(panelSelector, 3000);
const panel = querySelector(panelSelectors);
if (!panel || panel.offsetParent === null) {
  return { success: false, error: 'Panel did not open', category: 'state_error' };
}
```

**For dropdown selections**:
```javascript
// Verify the selected option after a dropdown interaction
optionEl.click();
await sleep(300);
const selected = el.getAttribute('aria-selected') || el.classList.contains('selected');
if (!selected) {
  return { success: false, error: 'Option not selected', category: 'state_error' };
}
```

**Auto-generation rule**: During code generation, for every function that takes a
value parameter and sets it on a DOM element, automatically insert readback code
after the set operation. Do not rely on the operation returning `{ success: true }`
without verifying the DOM actually changed.

### 5.3 Generate MCP Server

Create `MCPs/<APP_NAME>/server/index.mjs` based on the template.
Adapt it for the specific application:
- Set the server name and version
- Import all operations from `commands.mjs`
- Register each operation as an MCP tool with its parameter schema
- Configure the URL pattern for this application
- **Include mode switches** (see 5.3.1)

#### 5.3.1 Mode Switches

Every generated MCP server MUST support two independent mode switches via environment variables:

**BROWSER_MODE** — controls browser visibility:
- `"visible"` (default): Attach to the user's running Chrome via CDP. Requires Chrome
  running with `--remote-debugging-port=9222`.
- `"headless"`: Launch a headless Chromium instance. No visible browser window.

**DATA_MODE** — controls browser profile/session data:
- `"user"` (default): Use the user's real Chrome profile with all credentials, cookies,
  and stored data. In visible mode, this attaches to the running browser. In headless mode,
  this requires `CHROME_USER_DATA_DIR` to point to the user's Chrome profile directory.
- `"sandbox"`: Use a fresh, clean browser profile with no stored data. The application
  will appear as if visited for the first time (no login, no cookies, no history).

**Mode combinations and their use cases:**

| BROWSER_MODE | DATA_MODE | Use Case |
|---|---|---|
| visible | user | Default. Interactive use — agent works in the user's real browser session |
| visible | sandbox | Testing/demo — shows the browser but starts clean |
| headless | user | Background automation — uses credentials but no visible UI |
| headless | sandbox | CI/testing — fully isolated, no credentials, no UI |

The generated `index.mjs` should read these from `process.env` and implement the
corresponding `getPage()` connection logic.

**IMPORTANT — Template Self-Sufficiency**: Always use the template at
`<PROJECT_ROOT>/src/templates/mcp-server-template.mjs` as the authoritative
source for the server structure. The template is complete and self-contained —
it includes `getPage()` with re-validation and inject-once helper loading via
`_injectHelpers()` + `evaluateOnNewDocument`, `exec()` helper, `health_check`,
`show_scripts`, `run_script`, `protocolTimeout: 120_000` on connect calls, and
the tool registration pattern.
Do NOT reference or copy patterns from previously generated MCP servers under
`MCPs/`. Each new MCP server should be generated purely from templates + learned
operations. This ensures consistency and prevents copying bugs or app-specific
patterns from one MCP to another.

#### 5.3.2 ShowScripts Tool (Mandatory)

Every generated MCP server MUST include a `show_scripts` tool. This tool reads the
`commands.mjs` file at runtime and returns a list of all JavaScript functions used by
the MCP server, with their names, parameter signatures, and descriptions.

Add this tool registration to `index.mjs` (it does NOT use `page.evaluate` — it reads
the local file system):

```javascript
server.tool("show_scripts", "List all JavaScript functions used by this MCP server with their names, parameters, and descriptions", {}, async () => {
  const fs = await import('fs');
  const src = fs.readFileSync(new URL('./commands.mjs', import.meta.url), 'utf-8');
  const fns = [...src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*\{/g)];
  const descriptions = [...src.matchAll(/\/\*\*\s*\n\s*\*\s*(.+?)\n/g)];
  const result = fns.map((m, i) => ({
    name: m[1],
    parameters: m[2].trim() || 'none',
    description: descriptions[i]?.[1]?.trim() || ''
  }));
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
```

This tool gives users transparency into the underlying JavaScript that powers each MCP
operation, enabling inspection, debugging, and trust.

#### 5.3.3 Dynamic Helper Injection (Mandatory)

The MCP server MUST dynamically inject ALL exported functions from `commands.mjs`
into the browser context. This prevents the bug where a helper function is defined
in `commands.mjs` but not available inside `page.evaluate()`.

**Inject-in-getPage pattern** (already in the template — do NOT use a hardcoded
function list, do NOT check/re-inject on every `exec()` or `run_script` call):

```javascript
// Build injection payload ONCE at startup
const _helperSource = Object.entries(commands)
  .filter(([, v]) => typeof v === "function")
  .map(([, fn]) => fn.toString())
  .join("\n");

// Pre-compile the injection function — declares all helpers locally,
// then assigns each to window.* for global access.
const _helperInjection = new Function(
  _helperSource + "\n" +
  Object.entries(commands)
    .filter(([, v]) => typeof v === "function")
    .map(([name]) => `window.${name} = ${name};`)
    .join("\n") +
  "\nwindow.__mcpHelpersReady = true;"
);

const _injectedPages = new WeakSet();

async function _injectHelpers(p) {
  if (_injectedPages.has(p)) return;
  // Inject into current document (CDP Runtime.callFunctionOn — bypasses CSP)
  await p.evaluate(_helperInjection);
  // Auto-re-inject on future navigations (CDP Page.addScriptToEvaluateOnNewDocument)
  await p.evaluateOnNewDocument(_helperInjection);
  _injectedPages.add(p);
}
```

Injection happens inside `getPage()` — NOT in `exec()` or `run_script`. Once
`_injectHelpers(page)` runs for a page, helpers are globally available for the
lifetime of that tab, automatically surviving navigations via `evaluateOnNewDocument`.

**Why this approach**:
- **Zero per-call overhead** — no check, no re-injection on each tool call
- **Survives navigation** — `evaluateOnNewDocument` auto-runs on page loads
- **Bypasses Trusted Types CSP** — uses CDP protocol methods
  (`Runtime.callFunctionOn` and `Page.addScriptToEvaluateOnNewDocument`),
  NOT DOM manipulation (`addScriptTag` is blocked by CSP on Google, GitHub, etc.)
- **WeakSet tracking** — if the page object is garbage-collected and a new one
  found, injection runs again automatically

**Why export matters**: When you add a new helper (e.g., `clickSidebarTab`,
`findButtonByText`), it's automatically included in the injection payload. The
only requirement is that the helper is `export`ed from `commands.mjs`.

**NEVER** hardcode function names like this (anti-pattern):
```javascript
// BAD — breaks when new helpers are added
${commands.querySelector.toString()}
${commands.clickSidebarTab.toString()}  // what about the next helper?
```

### 5.4 Generate Package Files

Create `MCPs/<APP_NAME>/server/package.json` with the app-specific metadata.

Create `MCPs/<APP_NAME>/server/manifest.json`:
```json
{
  "name": "<APP_NAME>-mcp",
  "version": "1.0.0",
  "description": "MCP server for <APP_NAME>",
  "targetApp": {
    "name": "<APP_NAME>",
    "url": "<TARGET_URL>",
    "urlPattern": "<regex pattern matching the app>"
  },
  "modes": {
    "browser": {
      "visible": "Attach to user's running Chrome via CDP (default)",
      "headless": "Launch a headless browser instance"
    },
    "data": {
      "user": "Use user's Chrome profile with credentials (default)",
      "sandbox": "Use a clean browser profile with no stored data"
    }
  },
  "operations": [
    {
      "name": "operation_name",
      "description": "...",
      "category": "...",
      "confidence": 0.95
    }
  ],
  "generatedAt": "<ISO timestamp>",
  "frameworkVersion": "0.1.0"
}
```

### 5.5 Generate README

Create `MCPs/<APP_NAME>/README.md` — a human-readable document that ships with the MCP
server code in the git repo. This README is the primary documentation for anyone who
discovers or installs this MCP server.

**Required sections** (use this template):

```markdown
# <Display Name> MCP

Auto-generated MCP server for [<Display Name>](<TARGET_URL>) — <N> semantic tools
replacing raw browser automation.

## Tools

| # | Tool | Description | Parameters |
|---|------|-------------|------------|
| 1 | `tool_name` | What it does | `param1`, `param2?` |
| 2 | `tool_name` | What it does | — |
| ... | | | |

## Installation

1. Clone the repo and navigate to the server directory:

   ```bash
   cd MCPs/<APP_NAME>/server
   npm install
   ```

2. Start Chrome with remote debugging enabled:

   ```bash
   # macOS
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/chrome-cdp-profile"

   # Windows (in cmd.exe — or use Git Bash with cmd.exe expansion, see Phase 0.3)
   "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" ^
     --remote-debugging-port=9222 ^
     --user-data-dir="C:\Users\<username>\AppData\Local\Google\Chrome\CDP-Profile"

   # Linux
   google-chrome --remote-debugging-port=9222 \
     --user-data-dir="$HOME/.chrome-cdp-profile"
   ```

3. Add to your Claude Code MCP config (`.mcp.json`):

   ```json
   {
     "mcpServers": {
       "<APP_NAME>": {
         "type": "stdio",
         "command": "node",
         "args": ["MCPs/<APP_NAME>/server/index.mjs"],
         "env": {
           "CHROME_CDP_URL": "http://127.0.0.1:9222",
           "BROWSER_MODE": "visible",
           "DATA_MODE": "user"
         }
       }
     }
   }
   ```

4. Restart Claude Code. The MCP tools are now available.

## Mode Switches

| BROWSER_MODE | DATA_MODE | Use Case |
|---|---|---|
| `visible` | `user` | **Default.** Works in user's real browser |
| `visible` | `sandbox` | Testing — visible browser, clean profile |
| `headless` | `user` | Background automation with user credentials |
| `headless` | `sandbox` | CI/testing — fully isolated |

## Files

- `server/index.mjs` — Server entry point (tool registrations + CDP connection)
- `server/commands.mjs` — Learned JavaScript functions (executed in browser context)
- `server/manifest.json` — Server capabilities metadata
- `exploration/` — Artifacts from the learning phase

Generated by [AutoWebMCP](https://github.com/ApartsinProjects/AutoWebMCP).
```

Fill in the actual tool names, descriptions, parameters, and app-specific values.
The tools table should list ALL tools including `health_check` and `show_scripts`
(both are inherited from the server template — no need to define them manually).

---

## Phase 6: Validation & Publication

### 6.1 Install, Test, and Validate Each Tool

1. `cd` into the generated server directory
2. Run `npm install` to install dependencies
3. Verify the server has no syntax errors: `node --check index.mjs`
4. Verify commands have no syntax errors: `node --check commands.mjs`

#### 6.1.1 Per-Tool Live Validation (Mandatory)

**MANDATORY**: After syntax checks pass, validate each generated tool against
the live application in the browser. This catches selector mismatches, timing
issues, and logic errors that syntax checking cannot detect.

**Connection health check**: Before starting validation, run the CDP health
probe (Phase 0.5). If the browser is unreachable, relaunch before proceeding.

**Procedure**:
1. Navigate to the app in the browser (it should still be open from exploration)
2. For each tool, execute its corresponding `commands.mjs` function via the browser:
   - Use `javascript_tool` or `computer` to run the function
   - For mutation tools (set_title, add_question, etc.): execute, verify the
     result, then undo the change
   - For query tools (get_info, list_items, etc.): execute and verify the
     returned data matches what's visible
   - For navigation tools (navigate_tab, preview, etc.): execute and verify
     the view changes, then navigate back
3. **DOM Verification (MANDATORY for every tool)**:
   After executing each tool, verify the actual DOM/HTML state — do NOT trust
   only the function's return value. The function may return `{ success: true }`
   while the DOM is unchanged (e.g., `setInputValue` returning success but the
   input still showing the old value).

   **Verification methods** (in priority order):
   - **Read DOM directly**: Use `javascript_tool` to read the element's actual
     `value`, `textContent`, `innerHTML`, or attributes after the tool runs.
     Compare against expected state.
   - **Accessibility tree**: Use `read_page` to get the updated tree and verify
     the expected change appears (new elements, changed text, removed items).
   - **Screenshot** (if DOM readback is ambiguous): Take a screenshot and
     visually confirm the change. Use this for visual-only changes (color,
     layout, theme) where DOM readback isn't definitive.

   **Verification checklist per tool type**:
   - **Input/set tools** (set_title, set_text, etc.): Read back the element's
     `value` or `textContent` — it MUST match the value that was set
   - **Add/insert tools** (add_question, insert_text, etc.): Count elements
     before and after — count MUST increase by 1. Read back the new element's
     content to verify it matches.
   - **Delete/remove tools**: Count elements before and after — count MUST
     decrease. Verify the specific element is gone.
   - **Toggle tools**: Read the toggle's `checked`/`aria-checked`/class state
     before and after — it MUST flip.
   - **Navigation tools**: Check `window.location` or page content changed
   - **Query tools**: Cross-check returned data against visible page content

   **If verification fails**: The tool has a bug. Do NOT mark it as PASS.
   Diagnose the issue (wrong selector, timing, input method) and fix it in
   `commands.mjs`. Common fixes:
   - `setInputValue` not working → switch to `execCommand('insertText')` pattern
   - Element not found after click → add `waitForElement()` before accessing it
   - Wrong element targeted → scope to the active/focused container (e.g.,
     `getActiveQuestionCard()` instead of searching the whole document)

4. Record results for each tool:
   - **PASS**: Tool executed successfully AND DOM verification confirmed the change
   - **FAIL**: Tool returned an error, or DOM verification showed the change
     didn't actually happen — fix the selectors or logic in `commands.mjs` and
     re-validate
   - **SKIP**: Tool cannot be safely validated without side effects (e.g.,
     publish, send, delete without undo)

5. **Minimum validation threshold**: At least 70% of tools must PASS validation.
   If fewer than 70% pass, fix the failing tools before proceeding.

6. Update each tool's confidence score based on validation results:
   - PASS + semantic selectors → confidence 0.85-0.95
   - PASS + class-based selectors → confidence 0.70-0.80
   - SKIP (inferred but untested) → confidence 0.65-0.75
   - FAIL then fixed → confidence 0.75-0.85

**Selector validation cache**: Track which selectors have been confirmed working
during validation. If multiple tools share the same selector (e.g., several tools
use `[aria-label="Add question"]`), only validate that selector once. When a
selector is confirmed, mark it in a set and skip re-validation in subsequent tools.
This can reduce validation time by 20-30% for tools with overlapping selectors.

**Time budget**: Aim to validate each tool in 1-2 browser interactions. For a
30-tool server, this should take ~30-60 tool calls total.

**Sequence testing**: After individual tool validation, test tools in common
sequences (e.g., add_question → set_question_text → add_option → add_option).
Some tools work individually but break when chained due to focus/state issues.
Test at least 2-3 common sequences before proceeding.

**Selector resilience scoring**: During validation, score each tool's selector
strategy for resilience. Tools relying on CSS classes as primary selectors should
receive a 0.10 confidence penalty. Track which tools use only semantic selectors
(`aria-label`, `data-testid`, `role`) vs class-based or positional selectors.
Include this breakdown in the validation report so the user can prioritize
which tools to improve first.

**Cross-session stability testing**: If the app was explored in a previous session
and is being re-validated (option c in Phase 1), compare the current DOM structure
against the exploration log from the original session. Flag any selectors that no
longer match and prioritize fixing those tools. This catches UI changes that
occurred between learning sessions.

#### Automated Validation Scaffolding

After all tools are individually validated and sequence-tested, generate a
`_validate_all()` function in `commands.mjs` that automates smoke testing:

```javascript
export async function _validate_all() {
  const results = [];
  // 1. Call each query tool (get_*, list_*) and verify non-error response
  // 2. Call each mutation tool with minimal params + immediate undo
  //    (e.g., set_page_title("__test__") → set_page_title(originalTitle))
  // 3. Skip tools marked dangerous or irreversible in manifest
  // 4. Return { passed: [...], failed: [...], skipped: [...] }
  return { total: results.length, results };
}
```

Rules for generated validation:
- **Query tools**: Call with no args or safe defaults, expect `success: true`
- **Mutation tools**: Capture current state → mutate → verify → restore original
- **`__clickCoords` tools**: Tools that return `__clickCoords` (trusted click pattern)
  cannot be validated via `page.evaluate()` alone — they need the full `exec()` pipeline.
  The `_validate_all()` function should call these tools through the MCP server's own
  `exec()` function, or mark them as requiring manual validation
- **`__hoverCoords` tools**: Similarly, hover-reveal tools need the full exec() pipeline.
  Mark these for manual validation or call through exec()
- **Skip list**: Tools that create permanent side effects (e.g., `publish_site`,
  `delete_page`) are skipped and listed in the report
- **Output**: Return pass/fail summary; export for use via `run_script`

This function is NOT registered as an MCP tool — it's an internal diagnostic
callable through `run_script` for regression testing after app updates.

The generated server also supports `--smoke-test` mode: run `node index.mjs --smoke-test`
to verify basic connectivity and helper injection without starting the MCP server.

### 6.1.2 End-to-End Test Task (Mandatory)

After per-tool validation, create a **test task** that exercises the MCP server as a
whole — a realistic multi-step scenario that chains multiple tools together.

#### Create the test task file

Write a Markdown file at `MCPs/<APP_NAME>/test-task.md` describing a concrete task
that a user would perform with the application. The task should:

- Exercise at least 5-8 different tools in a logical workflow
- Include both query tools (get info, list items) and mutation tools (create, edit, set)
- Include at least one undo/navigation step
- Specify the exact expected outcome so success is objectively verifiable

**Example** (for a Google Forms MCP):
```markdown
# Test Task: Create a Feedback Form

## Steps
1. Create a new blank form
2. Set the form title to "Test Feedback Form"
3. Set the description to "Automated test — delete after verification"
4. Add a multiple choice question "How was your experience?" with options: Great, OK, Poor
5. Add a paragraph question "Any additional comments?"
6. Toggle the first question as required
7. Set the theme color to Blue
8. Get form info and verify: title matches, question count is 3 (default + 2 added)
9. Undo the theme color change
10. Get form info again to confirm

## Expected Outcome
- Form exists with title "Test Feedback Form"
- 3 questions total (1 default + 2 added)
- First added question is multiple choice, required, with 3 options
- Second added question is paragraph type
- Theme color is back to default (after undo)
```

#### Run the debug cycle

1. **Execute the test task** using the MCP server's tools (call them via `exec()` or
   the MCP tool calls if the server is already registered)
2. **If any tool fails**:
   - Diagnose the failure (selector not found, timing issue, wrong logic)
   - Fix the corresponding function in `commands.mjs`
   - Re-run the failing step and continue
3. **Repeat** until the entire test task completes successfully end-to-end
4. **Update confidence scores** based on test results — tools that worked on first
   try get higher confidence than tools that needed fixes
5. **Record the test result** at the bottom of `test-task.md`:
   ```markdown
   ## Test Result
   - Date: <ISO date>
   - Status: PASS / FAIL
   - Tools exercised: N
   - Fixes applied: list of functions fixed and what was wrong
   - Total debug cycles: N
   ```

**Important**: Do not skip this phase. The per-tool validation (6.1.1) catches
individual tool failures, but the test task catches **integration issues** — tools
that work alone but fail when chained together (e.g., focus management, state
transitions, timing between consecutive operations).

### 6.2 Update Catalogue

Read `<PROJECT_ROOT>/catalogue.json` and add/update the entry for this app.
The catalogue supports multiple MCPs per application. Add to the `applications` object:

```json
{
  "version": "2.0.0",
  "repository": "<read from existing catalogue.json or set to your GitHub repo>",
  "applications": {
    "<APP_NAME>": {
      "displayName": "<Human-Readable App Name>",
      "url": "<TARGET_URL>",
      "urlPattern": "<regex matching the app>",
      "mcps": [
        {
          "name": "<APP_NAME>-mcp",
          "version": "1.0.0",
          "path": "MCPs/<APP_NAME>/server",
          "operationCount": N,
          "confidence": 0.XX,
          "generatedAt": "<ISO date>"
        }
      ]
    }
  }
}
```

If an entry for this app already exists, append the new MCP to the `mcps` array
(or update the existing entry if it has the same name).

### 6.3 Auto-Register in `.mcp.json`

After updating the catalogue, automatically register the MCP server in
`<PROJECT_ROOT>/.mcp.json` so Claude Code can load it on next restart.

1. Read `<PROJECT_ROOT>/.mcp.json` (create it if it doesn't exist)
2. Add or update the server entry under `mcpServers`:

   ```json
   {
     "mcpServers": {
       "<APP_NAME>": {
         "type": "stdio",
         "command": "node",
         "args": ["MCPs/<APP_NAME>/server/index.mjs"],
         "env": {
           "CHROME_CDP_URL": "http://127.0.0.1:9222",
           "BROWSER_MODE": "<from Phase 0.4>",
           "DATA_MODE": "<from Phase 0.4>"
         }
       }
     }
   }
   ```

   Use the `BROWSER_MODE` and `DATA_MODE` values from Phase 0.4 (defaults:
   `visible` and `user` if Phase 0 was skipped because CDP was already running).

   Use **relative paths** in `args` — this keeps `.mcp.json` portable across machines.
   If `.mcp.json` already has other servers, merge the new entry without removing them.

3. This step is **automatic** — do not ask the user for permission. The whole point
   of learning is to make the MCP server immediately available after restart.

### 6.4 Report Results — Learned Tools Display

**IMPORTANT**: Always present the complete list of learned tools to the user in a clear table format.

Display a summary header:
```
## Learned MCP Server: <APP_NAME>
Target: <TARGET_URL>
Operations: N learned, M validated
Average confidence: XX%
```

Then display each learned tool in a table:

```
| # | Tool Name            | Description                                  | Parameters                         | Returns              | Confidence |
|---|----------------------|----------------------------------------------|-------------------------------------|----------------------|------------|
| 1 | compose_message      | Compose a new message with recipient and body | to: string, subject?: string, body: string | { success, messageId } | 95%        |
| 2 | search               | Search for items matching a query             | query: string, filter?: string      | { results: Item[] }  | 90%        |
```

After the table, list:
- **Failed operations**: Operations that were attempted but could not be reliably learned (with reason)
- **Low-confidence operations**: Operations included but with confidence < 80%
- **Unexplored areas**: UI regions or workflows that were not explored

Finally, provide usage instructions:
```
### Next Steps

The MCP server has been auto-registered in .mcp.json.

To activate it:
1. Restart Claude Code (the MCP server loads on startup)
2. Start Chrome with remote debugging: chrome --remote-debugging-port=9222
3. Navigate to <TARGET_URL>
4. Ask Claude to interact with the app — the WebMCP skill will
   automatically route through MCP tools instead of raw automation.
```

### 6.5 Offer to Commit and Push

After reporting results, ask the user if they want to push the new MCP to the git repo:

```
Would you like me to commit and push the new <APP_NAME> MCP server to the repo?

This will commit:
  - MCPs/<APP_NAME>/          (server code + exploration artifacts)
  - MCPs/<APP_NAME>/README.md (documentation)
  - MCPs/<APP_NAME>/test-task.md (integration test + results)
  - catalogue.json            (updated app registry)
  - .mcp.json                 (MCP server registration)
```

**If the user confirms**: Stage and commit the MCP files, then push:

```bash
git add MCPs/<APP_NAME>/ catalogue.json .mcp.json
git commit -m "Add <APP_NAME> MCP server — <N> tools

Generated by AutoWebMCP /learn-webapp skill.
Target: <TARGET_URL>

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

**If the user declines**: Skip this step. The MCP is still usable locally.

---

## Phase 7: Manual Tool Addition (On-Demand)

If the user says **"add tool"** followed by a textual description of a missing operation,
extend the existing MCP server for the current application.

### Workflow

1. **Parse the request**: Extract the operation name, intent, and any parameter hints from
   the user's description. Example: "add tool: archive conversation — moves the current
   open conversation to the archive folder"

2. **Explore the operation**: Use the browser to find and test how to perform this action:
   - Navigate to the app (if not already there)
   - Locate the relevant UI elements (buttons, menus, etc.)
   - Execute the action and observe results
   - Record selectors and the step sequence

3. **Define the operation**: Create the full operation definition following the Phase 4 format
   (name, description, parameters, returns, procedure, selectors).

4. **Validate**: Execute the procedure at least once to confirm it works.

5. **Update the generated files**:
   - **Append** the new function to `MCPs/<APP_NAME>/server/commands.mjs`
   - **Add** the new tool registration to `MCPs/<APP_NAME>/server/index.mjs`
   - **Update** `MCPs/<APP_NAME>/server/manifest.json` — add the operation to the
     operations array and increment any counters
   - **Update** `MCPs/<APP_NAME>/exploration/log.json` — add the exploration entries
     and the new inferred operation
   - **Update** `<PROJECT_ROOT>/catalogue.json` — bump operationCount in the relevant MCP entry

6. **Report**: Show the user the newly added tool in the same table format as Phase 6.4,
   confirming it was added to the existing server.

### Example

User: "add tool: mark as spam — marks the currently selected email as spam"

Result:
- New function `mark_as_spam()` added to commands.mjs
- New tool `mark_as_spam` registered in index.mjs
- Manifest updated with the new operation
- User sees confirmation with the tool's name, parameters, and confidence

---

## Important Guidelines

### Skill File Immutability

**NEVER modify any skill files during execution.** The following files are read-only
at runtime and must never be written to, edited, or overwritten:

- `.claude/skills/learn-webapp/SKILL.md`
- `.claude/skills/learn-webapp/exploration-guide.md`
- `.claude/skills/webmcp/SKILL.md`
- `skills/learn-webapp/SKILL.md`
- `skills/learn-webapp/exploration-guide.md`
- `skills/webmcp/SKILL.md`

Only MCP output files may be created or modified during execution:
- `MCPs/<APP_NAME>/server/*` (generated server code)
- `MCPs/<APP_NAME>/exploration/*` (exploration artifacts)
- `MCPs/<APP_NAME>/README.md` (generated documentation)
- `catalogue.json` (application registry)
- `.mcp.json` (MCP server registration)

### Safety
- NEVER enter credentials or sensitive data during exploration
- NEVER submit real forms with real data — use test/dummy values or stop before submission
- NEVER make purchases, send messages, or take irreversible actions
- If exploration requires authentication, ask the user to log in first
- Respect bot detection — do not try to bypass CAPTCHAs
- **Cautious exploration**: Before clicking any element, assess the risk:
  - **Safe to explore**: Read-only actions (opening menus, expanding sections, tabs,
    viewing settings, hovering for tooltips)
  - **Ask user first**: Actions that could modify data (delete buttons, submit/send,
    publish, share, archive, move), actions that could affect privacy (sharing
    settings, contact exports, permission changes), actions that navigate to
    external services or trigger OAuth flows
  - When in doubt, describe the element and ask: "This button appears to [action].
    Should I click it to explore, or skip it?"
- Do NOT blindly click every interactive element — prioritize safe, reversible actions

### Robustness
- Always use multiple selector strategies (ID > aria > role > class > structure)
- Always include waits after actions that trigger async updates
- Always handle the case where an element is not found
- Always reset state between explorations
- **Never match elements by current value or computed size** — use semantic attributes
  (`aria-label`, `data-*`, `role`) or structural position instead of fragile heuristics
  like `inp.value === 'Untitled'` or `inp.offsetWidth > 100`
- **Sanitize CSS selectors** — when building selectors from dynamic values (e.g.,
  `[aria-label="${label}"]`), always use `CSS.escape()` to prevent selector injection
- **MANDATORY: `waitForElement()` over `sleep()`** — After every click that
  triggers a DOM change, use `waitForElement()` to wait for the expected result.
  After every dismiss/close, use `waitForRemoval()` to wait for the element to
  disappear. `sleep()` is ONLY acceptable for animation timing (max 300ms) where
  no DOM change is observable. The generated `commands.mjs` should have far more
  `waitForElement()` calls than `sleep()` calls — if `sleep()` appears more
  frequently, the code quality is insufficient
- **Verify every parameter is used** — after generating a command function, check that
  every parameter in the function signature is actually referenced in the body. Remove
  unused parameters or implement their behavior
- **Only return `success: true` when the action was confirmed** — never return success
  on a fallback path that may not have acted. If no button was found and clicked,
  return `success: false`

### Quality
- Aim for descriptive, user-meaningful operation names
- Include clear descriptions that an LLM can use for tool selection
- Set realistic confidence scores — don't inflate them
- Only include operations that pass validation
- **Readback verification for mutations** — after setting a value (input, text content),
  read back the element's `value` or `textContent` and compare. If the readback doesn't
  match the intended value, return `{ success: false, error: "readback mismatch" }`
- **Pre-condition checks** — operations that act on the currently focused/selected
  element (e.g., `set_text_content`, `format_text`) must verify an appropriate element
  is focused/selected before acting. Return a clear error if no editable element is active
- **Confidence scoring** — weight confidence based on selector quality: operations using
  `aria-label` or `data-testid` selectors score higher than those using positional or
  value-based heuristics. Operations with fallback paths that could false-positive should
  be penalized. Simple, single-selector operations (undo, redo) naturally score highest

### Error Recovery
- If an interaction causes an unexpected page state (error page, crash, redirect):
  1. Take a screenshot to document what happened
  2. Try navigating back to `TARGET_URL`
  3. If the app is unresponsive, reload the page
  4. Log the error in the exploration log and skip that element
  5. Continue with the next element — don't halt the entire exploration
- If Chrome CDP connection drops, report the error and ask the user to restart Chrome

### Generated MCP Error Handling

Every generated MCP server should follow these error handling principles:

1. **Errors must propagate back to Claude**: When a tool function fails (selector not
   found, timeout, unexpected state), it should return a structured error response —
   NOT silently fail or return empty results. This lets Claude diagnose the problem.

   Generated `commands.mjs` functions should follow this pattern:
   ```javascript
   export async function tool_name(params) {
     const el = querySelector(['.primary-selector', '[aria-label="Fallback"]']);
     if (!el) {
       return { success: false, error: 'Element not found',
                selector: '.primary-selector',
                hint: 'The app UI may have changed — re-learn this tool' };
     }
     // ... execute operation ...
     return { success: true, result: '...' };
   }
   ```

2. **Error categories**: Generated tools should categorize errors to help Claude
   decide on the right recovery action:
   - `selector_not_found` — element selectors no longer match the DOM
   - `timeout` — element exists but didn't reach expected state in time
   - `state_error` — precondition not met (e.g., wrong page, element not visible, auth redirect)
   - `unknown` — unexpected or unclassified error

3. **Tool-level error wrapping**: The `exec()` helper in `index.mjs` already wraps
   every tool call in a try/catch that returns errors to Claude rather than crashing.
   All tool registrations MUST use `exec()` — never call `page.evaluate()` directly:
   ```javascript
   // CORRECT — uses exec() which handles errors and injects helpers
   server.tool("tool_name", "description", schema, async (params) => {
     return await exec(commands.tool_name, params);
   });

   // WRONG — bypasses exec(), loses helper injection and error handling
   server.tool("tool_name", "description", schema, async (params) => {
     const result = await page.evaluate(commands.tool_name, params);
     return { content: [{ type: "text", text: JSON.stringify(result) }] };
   });
   ```

4. **Self-healing metadata**: When returning errors, include enough context for the
   webmcp skill to propose targeted fixes:
   - Which selector(s) were tried
   - What page URL/title was active
   - What the expected vs actual DOM state was
   This information helps the webmcp skill's error recovery workflow and Phase 7
   (Manual Tool Addition) fix the specific broken tool without re-learning everything.

### Re-Learning / Versioning
- If an MCP already exists for this app in the catalogue, Phase 1 step 3 presents
  the user with four options: re-learn, update/extend, validate & update, or learn
  separate MCP. Always follow the user's chosen path.
- Re-learning (option a) bumps the version (e.g., `1.0.0` → `2.0.0`) and adds the
  new MCP alongside the old one in the `mcps` array. The old version remains for rollback.
- Update/extend (option b) keeps the same MCP and adds new tools with a minor version
  bump (e.g., `1.0.0` → `1.1.0`).
- Validate & update (option c) tests existing tools and fixes broken ones in-place.
- Separate MCP (option d) creates a new independent MCP with a distinct name.
- Always check for an existing MCP before creating a new one (Phase 1 step 3).

### Incremental Code Generation

For large apps with 20+ tools, generate code incrementally to manage context:

1. **Batch by view**: Generate all operations for one view (e.g., homepage) at a time,
   write to `commands.mjs`, then proceed to the next view (e.g., editor)
2. **Write-as-you-go**: After generating each batch of 5-8 operations, append them
   to `commands.mjs` rather than holding all operations in memory
3. **Checkpoint after approval**: Once the user approves the tool list (Phase 4.5),
   immediately write the approved operation definitions to `exploration/log.json`
   as a checkpoint. If context runs out during Phase 5, the next session can resume
   code generation from the checkpoint without re-exploring
4. **Template-based scaffolding**: For operations that follow a known interaction
   pattern (see Widget Interaction Pattern Classification in Phase 3), generate
   the function body from the pattern template + selectors automatically. Only
   operations with custom logic need manual procedure development

### Context Management
- Save exploration data incrementally (don't hold everything in memory)
- Use the Agent tool to parallelize independent explorations when appropriate
- Take screenshots at key moments for your own reference
