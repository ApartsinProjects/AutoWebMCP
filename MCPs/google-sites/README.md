# Google Sites MCP

Auto-generated MCP server for [Google Sites](https://sites.google.com) — 33 semantic tools replacing raw browser automation.

## Tools

| # | Tool | Description | Parameters |
|---|------|-------------|------------|
| 1 | `health_check` | Verify CDP connection | — |
| 2 | `show_scripts` | List all JavaScript functions in commands.mjs | — |
| 3 | `set_site_title` | Set browser tab title | `title` |
| 4 | `set_site_name` | Set header site name | `name` |
| 5 | `set_page_title` | Set hero heading | `title` |
| 6 | `insert_text_box` | Add text section | `text?`, `style?` |
| 7 | `set_text_content` | Replace selected text content | `text` |
| 8 | `format_text` | Apply bold/italic/underline | `format` |
| 9 | `set_text_style` | Set paragraph style | `style` |
| 10 | `insert_link` | Add hyperlink to selected text | `url` |
| 11 | `insert_button` | Add clickable button | `name`, `link` |
| 12 | `insert_divider` | Add horizontal divider | — |
| 13 | `insert_spacer` | Add vertical spacing | — |
| 14 | `insert_embed` | Embed external content | `url?`, `embedCode?` |
| 15 | `insert_image` | Open image picker | — |
| 16 | `insert_collapsible_group` | Add accordion section | — |
| 17 | `insert_table_of_contents` | Add table of contents | — |
| 18 | `insert_image_carousel` | Add image carousel | — |
| 19 | `add_page` | Create new page | `name` |
| 20 | `list_pages` | List all pages | — |
| 21 | `set_header_type` | Set header type | `type` |
| 22 | `delete_header` | Remove page header | — |
| 23 | `delete_section` | Delete selected section | — |
| 24 | `duplicate_section` | Duplicate selected section | — |
| 25 | `set_section_color` | Set section background color | `color` |
| 26 | `set_theme` | Change site theme | `theme` |
| 27 | `set_theme_color` | Set theme color variant | `color` |
| 28 | `undo` | Undo last action | — |
| 29 | `redo` | Redo last action | — |
| 30 | `preview_site` | Enter preview mode | — |
| 31 | `exit_preview` | Exit preview mode | — |
| 32 | `open_settings` | Open site settings dialog | — |
| 33 | `get_site_info` | Get current site metadata | — |

## Files

```
google-sites/
├── server/
│   ├── index.mjs       # Server entry point (tool registrations + CDP)
│   ├── commands.mjs    # Learned JavaScript functions
│   ├── manifest.json   # Capabilities metadata
│   └── package.json    # Dependencies
└── exploration/
    ├── log.json        # Exploration log from learning phase
    └── snapshots/      # Accessibility tree snapshots
```

## Mode Switches

| BROWSER_MODE | DATA_MODE | Use Case |
|---|---|---|
| `visible` | `user` | **Default.** Works in user's real browser |
| `visible` | `sandbox` | Testing — visible browser, clean profile |
| `headless` | `user` | Background automation with user credentials |
| `headless` | `sandbox` | CI/testing — fully isolated |

## Usage

Auto-registered in `.mcp.json`. Claude Code loads it automatically when interacting with Google Sites.
