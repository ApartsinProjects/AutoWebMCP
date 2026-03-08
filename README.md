# AutoWebMCP

Framework for deriving reusable, application-specific MCP servers from web applications through controlled exploration and semantic operation inference.

## Motivation

LLM-driven browser automation (clicking buttons, typing text, reading screenshots) is **fragile**. Web UIs change frequently, DOM selectors break, timing issues cause failures, and visual ambiguity leads to wrong actions. Every session starts from scratch with no memory of how the app works.

AutoWebMCP solves this by flipping the approach: **learn once, replay via semantic tools**.

Instead of raw browser automation, AutoWebMCP:

1. **Explores** a web application to understand its UI structure and interactions
2. **Infers** semantic operations (e.g., "set page title", "insert text box", "add page")
3. **Generates** a reusable MCP server that exposes those operations as high-level tools
4. **Routes** future interactions through the MCP server instead of raw clicks/typing

The result: interactions that are faster, more reliable, composable, and reusable across sessions.

### How It Improves Over Raw Browser Automation

| Aspect | Raw Automation | AutoWebMCP |
|--------|---------------|------------|
| Reliability | Breaks when DOM changes | Robust selectors with fallbacks |
| Speed | Screenshot → analyze → click per action | Direct JavaScript execution |
| Reusability | None — redo from scratch each time | Generated MCP server persists |
| Composability | Hard to chain actions reliably | Chain MCP tool calls naturally |
| Transparency | Black-box clicks | `show_scripts` reveals the JavaScript |
| Collaboration | Per-user, per-session | Share via GitHub catalogue |

## Usage Examples

### 1. Learn a Web Application

```
/learn-webapp https://your-app.com
```

The skill explores the app, discovers operations, and generates a full MCP server.
You review and approve the tool list before generation. The exploration is cautious —
it asks before clicking anything that could modify data, affect privacy, or trigger
irreversible actions.

### 2. Use the WebMCP Router

When you ask Claude to interact with a web app, the WebMCP skill automatically:
- Checks the catalogue for a matching MCP server
- Downloads and installs it from GitHub if needed
- Creates an execution plan and checks for missing tools
- Routes your request through semantic MCP tools

```
User: "Update the title and add an intro section"

WebMCP activated for: your-app.com

Catalogue match: your-app — Your App
MCPs available: 1
  1. your-app-mcp v1.0.0 — 15 tools, 90% confidence
Selected: your-app-mcp
Status: installed

Execution plan for: "Update title and add intro"
| # | Action              | MCP Tool         | Status    |
|---|---------------------|------------------|-----------|
| 1 | Set the title       | set_title        | available |
| 2 | Add intro section   | insert_content   | available |

Execution trace:
  1. set_title(value: "My Portfolio")
  2. insert_content(text: "Welcome to my site")
2 tools called, 0 errors.
```

For simple single-tool requests, the plan table is skipped — the tool executes directly.

### 3. Gap Analysis — Learning Missing Tools

If your request needs tools the MCP doesn't have yet:

```
Gap analysis: 1 of 3 actions requires tools not in the current MCP

Missing tools:
  - "Add a contact form" — no tool for form insertion

Options:
  a) Learn missing tools first (~2-5 min per tool)
  b) Skip missing — proceed with available tools only
  c) Use raw automation for gaps
```

Choosing (a) explores the app inline to learn the missing operation, adds it to
the MCP server, and continues after a restart.

### 4. Inspect MCP Server Internals

```
→ show_scripts()
```

Every generated MCP server includes a `show_scripts` tool that returns all
JavaScript functions powering the server — names, parameters, and descriptions.

## Architecture

```
User Request
    │
    ▼
┌─────────────┐     ┌──────────────┐
│  WebMCP      │────▶│ catalogue.json│
│  Routing     │     └──────┬───────┘
│  Skill       │            │ match?
└──────┬───────┘            │
       │              ┌─────▼──────┐
       │         yes  │ Plan & Gap │
       │         ┌───▶│ Analysis   │
       │         │    └─────┬──────┘
       │         │          │
       │         │    ┌─────▼──────┐
       │         │    │ MCP Server │
       │         │    │ (learned)  │──────▶ Chrome CDP ──▶ Web App
       │         │    └────────────┘
       ▼         │
  ┌────────┐     │    ┌────────────┐
  │ Match? │─────┘    │ Raw Browser│
  │        │── no ──▶ │ or /learn  │──────▶ Chrome CDP ──▶ Web App
  └────────┘          └────────────┘
```

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **learn-webapp** skill | `.claude/skills/learn-webapp/` | Explores web apps, generates MCP servers |
| **webmcp** skill | `.claude/skills/webmcp/` | Routes requests through learned MCPs |
| **catalogue.json** | Root | Maps applications to MCP servers |
| **MCPs/** | `MCPs/<app-name>/server/` | Generated MCP server packages |
| **Templates** | `src/templates/` | Code generation templates |
| **Docs** | `docs/` | Project documentation |

### Generated MCP Server Structure

Each learned MCP server contains:

```
MCPs/<app-name>/
├── server/
│   ├── index.mjs        # MCP server entry point
│   ├── commands.mjs     # JavaScript command library
│   ├── manifest.json    # Server capabilities manifest
│   └── package.json     # Dependencies
├── exploration/
│   └── log.json         # Exploration data
└── README.md            # Auto-generated docs
```

### Mode Switches

Every generated MCP server supports two environment variables:

| BROWSER_MODE | DATA_MODE | Use Case |
|---|---|---|
| `visible` | `user` | **Default.** Works in user's real browser |
| `visible` | `sandbox` | Testing with visible browser, clean profile |
| `headless` | `user` | Background automation with user credentials |
| `headless` | `sandbox` | CI/testing — fully isolated |

## Register and Create a New MCP

### Step 1: Learn the Application

```
/learn-webapp https://your-app-url.com your-app-name
```

The skill will:
1. Navigate to the app and check for authentication (asks you to log in if needed)
2. Map the UI structure, including iframe detection
3. Explore interactive elements cautiously (asks before risky actions)
4. Infer semantic operations from observed behavior
5. Present the tool list for your approval (you can add/remove/request tools)
6. Generate the MCP server code with mode switches and `show_scripts`
7. Install dependencies and register in the catalogue

### Step 2: Verify the Generated Server

```bash
node src/utils/repository.mjs list          # List all learned MCPs
node src/utils/repository.mjs info your-app  # Show details + operations
node --check MCPs/your-app/server/index.mjs  # Syntax check
```

### Step 3: Use It

The WebMCP skill will automatically detect and use the new MCP server whenever
you interact with the learned application. It creates an execution plan, checks
for missing tools, and reports the result.

### Step 4: Share It

Push to the repository so others can download and use your MCP:

```bash
git add MCPs/your-app-name/ catalogue.json
git commit -m "Add MCP server for your-app-name"
git push
```

Other users can then download the MCP automatically when the WebMCP skill
detects a catalogue match from the GitHub repository.

## Catalogue Format

The `catalogue.json` maps applications to one or more MCP servers:

```json
{
  "version": "2.0.0",
  "repository": "<github-org/repo>",
  "applications": {
    "<app-name>": {
      "displayName": "<Human-Readable Name>",
      "url": "<app-url>",
      "urlPattern": "<regex>",
      "mcps": [
        {
          "name": "<app-name>-mcp",
          "version": "1.0.0",
          "path": "MCPs/<app-name>/server",
          "operationCount": 23,
          "confidence": 0.88,
          "generatedAt": "2026-03-08"
        }
      ]
    }
  }
}
```

Multiple MCPs per application are supported for different feature sets or versions.
The `repository` field is used by WebMCP to fetch the catalogue from GitHub when
a local match isn't found.

## Key Features

- **Execution planning**: WebMCP creates a plan table before executing, mapping each action to an MCP tool
- **Gap analysis**: Missing tools are identified before execution — learn them on-demand, skip, or use raw automation
- **Cautious exploration**: The learning skill assesses risk before clicking, asking the user before potentially harmful actions
- **Authentication detection**: Detects login redirects and asks the user to authenticate before exploring
- **Iframe handling**: Discovers and traverses iframes for apps that render content in embedded frames
- **Error recovery**: Retries once on transient failures, reports clearly on persistent errors
- **MCP versioning**: Re-learning an app creates a new version alongside the old one
- **Cross-platform**: Uses Node.js for base64 decoding and path resolution (works on Windows and Unix)

## License

MIT
