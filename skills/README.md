# Skills

Shareable copies of Claude Code skills. These are synced with `.claude/skills/` (where Claude Code discovers them).

## Skills

### `/learn-webapp`

Explores a web application and generates a reusable MCP server. Walks through the app's UI, discovers available operations, asks for user approval, then generates a complete MCP server package with semantic tools.

**Files:**
- `learn-webapp/SKILL.md` — Main skill definition (phases, rules, code generation spec)
- `learn-webapp/exploration-guide.md` — Detailed exploration methodology

### `/webmcp`

Runtime routing skill. Fires automatically when Claude is about to interact with a web app. Checks `catalogue.json` for a matching MCP server and routes through semantic tools instead of raw browser automation.

**Files:**
- `webmcp/SKILL.md` — Skill definition (matching, routing, error tracking)
