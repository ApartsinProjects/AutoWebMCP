# AutoWebMCP

Framework for deriving reusable, application-specific MCP servers from web applications through controlled exploration and semantic operation inference.

## Project Structure

- `.claude/skills/learn-webapp/` — The learning skill that explores web apps and generates MCP servers
- `.claude/skills/webmcp/` — The runtime routing skill that intercepts web app tasks and routes them through learned MCP servers
- `src/templates/` — Templates used during MCP server code generation
- `src/utils/` — Utility scripts (repository management, manifest handling)
- `MCPs/` — Generated MCP server packages (one directory per application)
- `docs/` — Project documentation
- `skills/` — Shareable copies of skills (synced with `.claude/skills/`)
- `catalogue.json` — Maps applications to their MCP servers (supports multiple MCPs per app)

## Conventions

- All generated code uses ES modules (`"type": "module"`)
- Generated MCP servers use `@modelcontextprotocol/sdk` and `puppeteer-core`
- MCP entries are stored as directories under `MCPs/<app-name>/`
- Each generated server includes a `manifest.json` describing its capabilities
- Every generated server includes a `show_scripts` tool for JavaScript introspection

## Key Paths

- Learning skill: `.claude/skills/learn-webapp/SKILL.md`
- Runtime routing skill: `.claude/skills/webmcp/SKILL.md`
- MCP server template: `src/templates/mcp-server-template.mjs`
- Application catalogue: `catalogue.json`
- GitHub repository: `ApartsinProjects/AutoWebMCP`

## Skill Workflow

1. **WebMCP (runtime)**: When the user asks to interact with a web app, this skill
   fires first. It checks `catalogue.json` for a matching MCP server, downloads it
   from GitHub if needed, and routes through semantic tools instead of raw browser clicks.

2. **learn-webapp (learning)**: When no MCP server exists for an app, or the user
   explicitly asks, this skill explores the app and generates a new MCP server.
   Includes a mandatory user approval gate before code generation.
