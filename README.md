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
/learn-webapp https://sites.google.com
```

This explores Google Sites, discovers 23+ operations, and generates a full MCP server.
You review and approve the tool list before generation.

### 2. Use the WebMCP Router

When you ask Claude to interact with a web app, the WebMCP skill automatically:
- Checks the catalogue for a matching MCP server
- Downloads and installs it if needed
- Routes your request through semantic tools

```
User: "Set the page title to 'My Portfolio' and add a text section about me"

WebMCP activated for: sites.google.com
Catalogue match: google-sites — Google Sites
MCPs available: 1
  1. google-sites-mcp v1.0.0 — 23 tools, 88% confidence
Selected: google-sites-mcp
Status: installed

Execution trace:
  1. set_page_title(title: "My Portfolio")
  2. insert_text_box(text: "About me...", style: "normal")
2 tools called, 0 errors.
```

### 3. Build a Full Page with Chained Tools

```
User: "Build a landing page for my consulting business"

→ set_site_title(title: "Acme Consulting")
→ set_page_title(title: "Transform Your Business")
→ insert_text_box(text: "We help companies...", style: "heading")
→ insert_text_box(text: "Our expertise spans...")
→ insert_button(name: "Get Started", link: "/contact")
→ insert_divider()
→ insert_text_box(text: "Our Services", style: "subheading")
```

### 4. Inspect MCP Server Internals

```
User: "Show me the scripts for the Google Sites MCP"

→ show_scripts()

Returns a list of all JavaScript functions powering the server with their
names, parameters, and descriptions.
```

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
       │         yes  │ MCP Server │
       │         ┌───▶│ (learned)  │──────▶ Chrome CDP ──▶ Web App
       │         │    └────────────┘
       │         │
       ▼         │    ┌────────────┐
  ┌────────┐     │    │ Raw Browser│
  │ Match? │─────┘    │ Automation │──────▶ Chrome CDP ──▶ Web App
  │        │── no ──▶ └────────────┘
  └────────┘          (fallback / learn)
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
1. Navigate to the app and map its UI
2. Explore interactive elements systematically
3. Infer semantic operations
4. Present the tool list for your approval (you can add/remove tools)
5. Generate the MCP server code
6. Install dependencies and register in the catalogue

### Step 2: Verify the Generated Server

Check the catalogue:
```bash
node src/utils/repository.mjs list
node src/utils/repository.mjs info your-app-name
```

### Step 3: Use It

The WebMCP skill will automatically detect and use the new MCP server whenever
you interact with the learned application.

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
  "repository": "ApartsinProjects/AutoWebMCP",
  "applications": {
    "google-sites": {
      "displayName": "Google Sites",
      "url": "https://sites.google.com",
      "urlPattern": "sites\\.google\\.com",
      "mcps": [
        {
          "name": "google-sites-mcp",
          "version": "1.0.0",
          "path": "MCPs/google-sites/server",
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

## License

MIT
