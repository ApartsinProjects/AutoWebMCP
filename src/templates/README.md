# Templates

Template files used by `/learn-webapp` to generate MCP server packages.

## Files

- **`mcp-server-template.mjs`** — Main server template. Includes CDP connection, dynamic helper injection, `health_check` and `show_scripts` tools, and placeholder for learned tool registrations. Placeholders (`{{APP_NAME}}`, `{{TARGET_URL}}`, etc.) are replaced during generation.

- **`commands-template.mjs`** — Template for the commands library. All learned JavaScript functions go here as named exports. Every function is automatically injected into the browser context via `page.evaluate()`.

- **`package-template.json`** — Package manifest template. Dependencies: `@modelcontextprotocol/sdk`, `puppeteer-core`, `zod`.

## Key Pattern: Dynamic Helper Injection

The template uses dynamic injection to make all exported functions from `commands.mjs` available inside `page.evaluate()`:

```javascript
const _helperSource = Object.entries(commands)
  .filter(([, v]) => typeof v === "function")
  .map(([, fn]) => fn.toString())
  .join("\n");
```

This means every function in `commands.mjs` must be exported — never use unexported helper functions.
