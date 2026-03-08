# Google Sites MCP Server

Auto-generated MCP server providing 23 semantic operations for the Google Sites editor.

## Operations

| # | Tool | Description | Parameters | Category |
|---|------|-------------|------------|----------|
| 1 | `health_check` | Check connectivity | — | retrieval |
| 2 | `set_site_title` | Set site title | `title: string` | data entry |
| 3 | `set_page_title` | Set hero page title | `title: string` | data entry |
| 4 | `insert_text_box` | Insert text box | `text?: string, style?: enum` | editing |
| 5 | `set_text_content` | Replace selected text | `text: string` | editing |
| 6 | `format_text` | Bold/italic/underline | `format: enum` | editing |
| 7 | `insert_button` | Insert button element | `name: string, link: string` | editing |
| 8 | `insert_embed` | Embed URL or HTML | `url?: string, embedCode?: string` | editing |
| 9 | `insert_divider` | Insert divider line | — | editing |
| 10 | `insert_spacer` | Insert vertical space | — | editing |
| 11 | `insert_image` | Open image picker | — | editing |
| 12 | `add_page` | Add new page | `name: string` | workflow |
| 13 | `list_pages` | List all pages | — | retrieval |
| 14 | `set_theme` | Change site theme | `theme: string` | workflow |
| 15 | `undo` | Undo last action | — | navigation |
| 16 | `redo` | Redo last action | — | navigation |
| 17 | `preview_site` | Enter preview mode | — | navigation |
| 18 | `exit_preview` | Exit preview mode | — | navigation |
| 19 | `delete_section` | Delete selected section | — | editing |
| 20 | `duplicate_section` | Duplicate section | — | editing |
| 21 | `open_settings` | Open settings dialog | — | navigation |
| 22 | `get_site_info` | Get site metadata | — | retrieval |
| 23 | `list_insert_options` | List sidebar options | — | retrieval |

## Mode Switches

| BROWSER_MODE | DATA_MODE | Use Case |
|---|---|---|
| `visible` | `user` | **Default.** Agent works in user's real browser |
| `visible` | `sandbox` | Testing — visible browser, clean profile |
| `headless` | `user` | Background automation with user credentials |
| `headless` | `sandbox` | CI/testing — fully isolated |

## Installation

```bash
cd repository/google-sites/server
npm install
```

## Usage

Add to your Claude Code MCP config (`.claude/settings.json` or similar):

```json
{
  "mcpServers": {
    "google-sites": {
      "command": "node",
      "args": ["/absolute/path/to/repository/google-sites/server/index.mjs"],
      "env": {
        "CHROME_CDP_URL": "http://127.0.0.1:9222",
        "BROWSER_MODE": "visible",
        "DATA_MODE": "user"
      }
    }
  }
}
```

Start Chrome with remote debugging:
```bash
chrome --remote-debugging-port=9222
```
