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
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
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

All output goes under: `E:/Projects/AutoWebMCP/MCPs/<APP_NAME>/`

---

## Phase 1: Initialization

1. Parse arguments. If no URL is provided, ask the user for one.
2. Derive `APP_NAME` if not provided.
3. Create the output directory structure:

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

4. Get the browser tab context using `tabs_context_mcp`. Create a new tab if needed using `tabs_create_mcp`.
5. Navigate to `TARGET_URL` in the tab.
6. Wait for the page to load, then take a screenshot and save it as the baseline.

---

## Phase 2: Page Reconnaissance

**Goal**: Build a complete map of the application's UI structure and interactive elements.

### 2.1 Structural Analysis

1. Use `read_page` (with `filter: "all"`) to get the full accessibility tree. Save the output.
2. Use `read_page` (with `filter: "interactive"`) to get all interactive elements. Save the output.
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

## Phase 3: Interaction Exploration

**Goal**: Systematically probe interactive elements to understand what they do.

### Strategy

Work through elements grouped by region. For each region, explore the most
prominent/important elements first. Use this priority order:

1. **Primary actions** — Large buttons, submit buttons, compose/create actions
2. **Form inputs** — Text fields, dropdowns, checkboxes, date pickers
3. **Navigation** — Menu items, tabs, links to sub-views
4. **Secondary actions** — Toolbar buttons, context menus, toggles
5. **Informational** — Tooltips, expandable sections, status indicators

### Exploration Procedure (for each element)

For each element to explore:

1. **Pre-state capture**:
   - Take a screenshot (save to `exploration/snapshots/pre-<ref>.png` conceptually — use the screenshot tool)
   - Read the page snapshot (`read_page`) focusing on the region around the element
   - Note the current URL

2. **Execute interaction**:
   - For buttons/links: `computer` tool with `left_click` on the element (use `ref` or coordinates)
   - For inputs: `form_input` to set a test value, or `computer` with `type`
   - For dropdowns: Click to open, read options, click an option
   - For menus: Hover or click to expand, catalog sub-items

3. **Post-state capture**:
   - Take a screenshot immediately after the interaction
   - Read the page snapshot again
   - Check for:
     - **New elements** appearing (modals, dropdowns, panels, toast messages)
     - **Removed elements** (closed dialogs, hidden sections)
     - **Changed values** (field updates, counter changes)
     - **URL changes** (navigation occurred)
     - **Network requests** (use `read_network_requests` to check for API calls)
     - **Console messages** (use `read_console_messages` for errors or logs)

4. **Record observation**:
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

5. **Reset state**:
   - If the interaction opened a modal/dialog, close it (press Escape or click close button)
   - If the interaction navigated away, navigate back to `TARGET_URL`
   - Verify the page is back to a known state before the next exploration

### Multi-step Workflow Discovery

After exploring individual elements, look for multi-step workflows:

1. Identify elements whose interactions lead to new UI states (modals, forms, panels)
2. Explore the NEW elements within those states
3. Trace the full workflow: trigger → fill/interact → confirm/submit → result
4. Record the complete workflow as a sequence of explorations

### Exploration Budget

- Explore at minimum 15-20 interactive elements
- Explore at minimum 2-3 complete multi-step workflows
- Stop when you've covered all major regions and primary actions
- Skip purely decorative or repetitive elements (e.g., 50 identical list items — explore 1-2)

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
| 1 | set_site_title       | Set the site title shown in the browser tab       |
| 2 | insert_text_box      | Insert a text box with optional content           |
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

**If the user approves**: Proceed to Phase 5 (Code Generation).

### 4.5.3 Loop

Repeat steps 4.5.1–4.5.2 until the user explicitly approves. Only approval moves
to Phase 5. Never skip this gate or auto-approve.

---

## Phase 5: Code Generation

**Goal**: Generate the MCP server package from the user-approved operations.

### 5.1 Read Templates

Read the following template files:
- `E:/Projects/AutoWebMCP/src/templates/mcp-server-template.mjs`
- `E:/Projects/AutoWebMCP/src/templates/package-template.json`

### 5.2 Generate Command Library

Create `MCPs/<APP_NAME>/server/commands.mjs`:

```javascript
// Auto-generated command library for <APP_NAME>
// Generated by AutoWebMCP learn-webapp skill
// Target: <TARGET_URL>
// Date: <timestamp>

// --- Utility Functions ---

function querySelector(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function waitForElement(selectors, timeout = 5000) {
  // ... polling-based wait
}

function setInputValue(el, value) {
  // ... React/Vue compatible value setting
}

// --- Learned Operations ---
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
corresponding `getPage()` connection logic. See `E:/Projects/AutoWebMCP/MCPs/google-sites/server/index.mjs`
for a reference implementation.

#### 5.3.2 ShowScripts Tool (Mandatory)

Every generated MCP server MUST include a `show_scripts` tool. This tool reads the
`commands.mjs` file at runtime and returns a list of all JavaScript functions used by
the MCP server, with their names, parameter signatures, and descriptions.

Add this tool registration to `index.mjs` (it does NOT use `page.evaluate` — it reads
the local file system):

```javascript
server.tool("show_scripts", "List all JavaScript functions used by this MCP server", {}, async () => {
  const fs = await import('fs');
  const src = fs.readFileSync(new URL('./commands.mjs', import.meta.url), 'utf-8');
  const fns = [...src.matchAll(/export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)\s*\{/g)];
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

Create `MCPs/<APP_NAME>/README.md` documenting:
- What the MCP server does
- List of available operations
- How to install and use it
- Configuration (Chrome CDP URL)

---

## Phase 6: Validation & Publication

### 6.1 Install and Test

1. `cd` into the generated server directory
2. Run `npm install` to install dependencies
3. Verify the server starts: `node index.mjs --help` or a quick smoke test

### 6.2 Update Catalogue

Read `E:/Projects/AutoWebMCP/catalogue.json` and add/update the entry for this app.
The catalogue supports multiple MCPs per application. Add to the `applications` object:

```json
{
  "version": "2.0.0",
  "repository": "ApartsinProjects/AutoWebMCP",
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

### 6.3 Report Results — Learned Tools Display

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
### How to Use

1. Start Chrome with remote debugging:
   chrome --remote-debugging-port=9222

2. Navigate to <TARGET_URL>

3. Add to your MCP config:
   {
     "mcpServers": {
       "<APP_NAME>": {
         "command": "node",
         "args": ["<absolute-path-to>/MCPs/<APP_NAME>/server/index.mjs"],
         "env": { "CHROME_CDP_URL": "http://127.0.0.1:9222" }
       }
     }
   }
```

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
   - **Update** `E:/Projects/AutoWebMCP/catalogue.json` — bump operationCount in the relevant MCP entry

6. **Report**: Show the user the newly added tool in the same table format as Phase 6.3,
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

### Safety
- NEVER enter credentials or sensitive data during exploration
- NEVER submit real forms with real data — use test/dummy values or stop before submission
- NEVER make purchases, send messages, or take irreversible actions
- If exploration requires authentication, ask the user to log in first
- Respect bot detection — do not try to bypass CAPTCHAs

### Robustness
- Always use multiple selector strategies (ID > aria > role > class > structure)
- Always include waits after actions that trigger async updates
- Always handle the case where an element is not found
- Always reset state between explorations

### Quality
- Aim for descriptive, user-meaningful operation names
- Include clear descriptions that an LLM can use for tool selection
- Set realistic confidence scores — don't inflate them
- Only include operations that pass validation

### Context Management
- Save exploration data incrementally (don't hold everything in memory)
- Use the Agent tool to parallelize independent explorations when appropriate
- Take screenshots at key moments for your own reference
