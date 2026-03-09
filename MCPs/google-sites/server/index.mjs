#!/usr/bin/env node
// =============================================================================
// Auto-generated MCP Server for: google-sites
// Target: https://sites.google.com
// Generated: 2026-03-08
// Version: 2.0.0
// Framework: AutoWebMCP v0.1.0
// =============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import puppeteer from "puppeteer-core";
import { z } from "zod";
import * as commands from "./commands.mjs";

// --- Configuration ---

const APP_NAME = "google-sites";
const TARGET_URL = "https://sites.google.com/new";
const URL_PATTERN = /sites\.google\.com/;

// --- Mode Switches ---
// BROWSER_MODE: "visible" (attach to user's Chrome) or "headless" (launch headless)
// DATA_MODE: "user" (use user's Chrome profile with credentials/data) or "sandbox" (clean profile)

const BROWSER_MODE = process.env.BROWSER_MODE || "visible";
const DATA_MODE = process.env.DATA_MODE || "user";

// --- Helper Injection ---

const _helperSource = Object.entries(commands)
  .filter(([, v]) => typeof v === "function")
  .map(([, fn]) => fn.toString())
  .join("\n");

const _helperInjection = new Function(
  _helperSource + "\n" +
  Object.entries(commands)
    .filter(([, v]) => typeof v === "function")
    .map(([name]) => `window.${name} = ${name};`)
    .join("\n") +
  "\nwindow.__mcpHelpersReady = true;"
);

// --- Browser Connection ---

let browser = null;
let page = null;
const _injectedPages = new WeakSet();

async function _injectHelpers(p) {
  if (_injectedPages.has(p)) return;
  await p.evaluate(_helperInjection);
  await p.evaluateOnNewDocument(_helperInjection);
  _injectedPages.add(p);
}

async function getPage() {
  // Re-validate cached page: must still be open AND on the target app
  if (page && !page.isClosed()) {
    try {
      const url = page.url();
      if (URL_PATTERN.test(url)) return page;
    } catch { /* page reference is stale */ }
    page = null;
  }
  // Search all open tabs for one matching the target app
  if (browser) {
    try {
      const pages = await browser.pages();
      page = pages.find(p => URL_PATTERN.test(p.url()));
      if (page) { await _injectHelpers(page); return page; }
    } catch { browser = null; }
  }

  if (BROWSER_MODE === "headless" && DATA_MODE === "sandbox") {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    page = await browser.newPage();
    await _injectHelpers(page);
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  } else if (BROWSER_MODE === "headless" && DATA_MODE === "user") {
    const userDataDir = process.env.CHROME_USER_DATA_DIR;
    if (!userDataDir) {
      throw new Error(
        "CHROME_USER_DATA_DIR env var required for headless+user mode. " +
        "Set it to your Chrome profile directory."
      );
    }
    browser = await puppeteer.launch({
      headless: true,
      userDataDir,
      args: ["--no-sandbox"],
    });
    page = await browser.newPage();
    await _injectHelpers(page);
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  } else if (BROWSER_MODE === "visible" && DATA_MODE === "sandbox") {
    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox"],
    });
    page = await browser.newPage();
    await _injectHelpers(page);
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  } else {
    // Visible + User (default): connect to user's running Chrome via CDP
    const wsEndpoint = process.env.BROWSER_WS_ENDPOINT;
    const cdpUrl = process.env.CHROME_CDP_URL || "http://127.0.0.1:9222";

    if (wsEndpoint) {
      browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint, protocolTimeout: 120_000 });
    } else {
      browser = await puppeteer.connect({ browserURL: cdpUrl, protocolTimeout: 120_000 });
    }

    const pages = await browser.pages();
    page = pages.find((p) => URL_PATTERN.test(p.url()));

    if (!page) {
      page = await browser.newPage();
      await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
    }
    await _injectHelpers(page);
  }

  return page;
}

// --- Command Execution Helper ---

async function exec(fn, params = {}) {
  try {
    const p = await getPage();
    const currentUrl = p.url();
    if (!URL_PATTERN.test(currentUrl)) {
      return {
        content: [{ type: "text", text: JSON.stringify({
          success: false,
          error: `Not on a ${APP_NAME} page. Current URL: ${currentUrl}`,
          category: "state_error",
          hint: `Navigate to ${TARGET_URL} first`,
        }) }],
        isError: true,
      };
    }
    let result = await p.evaluate(
      new Function("params", `
        ${fn.toString().replace(/^async function \w+/, 'async function fn')}
        return fn(params);
      `),
      params
    );
    // Support trusted click: commands can return __clickCoords to request a
    // puppeteer-level mouse click (needed for widgets that check isTrusted).
    if (result && result.__clickCoords) {
      const { x, y } = result.__clickCoords;
      await p.mouse.click(x, y);
      await new Promise(r => setTimeout(r, 500));
      // Re-evaluate for final result if a follow-up function was provided
      if (result.__followUp) {
        result = await p.evaluate(new Function(`return (${result.__followUp})()`));
      } else {
        delete result.__clickCoords;
      }
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: JSON.stringify({
        success: false,
        error: error.message,
        category: error.message.includes("not found") ? "selector_not_found"
          : error.message.includes("timeout") ? "timeout"
          : error.message.includes("precondition") || error.message.includes("not visible") ? "state_error"
          : "unknown"
      }) }],
      isError: true,
    };
  }
}

// --- MCP Server ---

const server = new McpServer({
  name: "google-sites-mcp",
  version: "2.0.0",
});

// --- Health Check ---

server.tool(
  "health_check",
  "Check connectivity to Google Sites editor",
  {},
  async () => {
    try {
      const p = await getPage();
      const url = p.url();
      const title = await p.title();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            app: APP_NAME,
            url,
            title,
            browserMode: BROWSER_MODE,
            dataMode: DATA_MODE,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: error.message }) }],
        isError: true,
      };
    }
  }
);

// --- ShowScripts — Introspection Tool ---

server.tool(
  "show_scripts",
  "List all JavaScript functions used by this MCP server with their names, parameters, and descriptions",
  {},
  async () => {
    const fs = await import("fs");
    const src = fs.readFileSync(new URL("./commands.mjs", import.meta.url), "utf-8");
    const fns = [...src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*\{/g)];
    const descriptions = [...src.matchAll(/\/\*\*\s*\n\s*\*\s*(.+?)\n/g)];
    const result = fns.map((m, i) => ({
      name: m[1],
      parameters: m[2].trim() || "none",
      description: descriptions[i]?.[1]?.trim() || "",
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// --- Site-Level Tools ---

server.tool(
  "set_site_title",
  "Set the site title (shown in browser tab and top bar)",
  { title: z.string().describe("The new site title") },
  async ({ title }) => exec(commands.set_site_title, { title })
);

server.tool(
  "set_site_name",
  "Set the site name displayed in the hero/header area",
  { name: z.string().describe("The site name to display in the header") },
  async ({ name }) => exec(commands.set_site_name, { name })
);

server.tool(
  "set_page_title",
  "Set the page title (large heading in the hero/header section)",
  { title: z.string().describe("The new page title text") },
  async ({ title }) => exec(commands.set_page_title, { title })
);

// --- Content Insertion Tools ---

server.tool(
  "insert_text_box",
  "Insert a new text box in the page body with optional content",
  {
    text: z.string().optional().describe("Text to pre-fill in the text box"),
    style: z.enum(["normal", "heading", "subheading", "title"]).optional().describe("Text style"),
  },
  async ({ text, style }) => exec(commands.insert_text_box, { text, style })
);

server.tool(
  "set_text_content",
  "Replace the content of the currently selected text element",
  { text: z.string().describe("New text content") },
  async ({ text }) => exec(commands.set_text_content, { text })
);

server.tool(
  "format_text",
  "Apply formatting to the currently selected text",
  { format: z.enum(["bold", "italic", "underline"]).describe("Format to apply") },
  async ({ format }) => exec(commands.format_text, { format })
);

server.tool(
  "set_text_style",
  "Set paragraph style for the current text element",
  { style: z.enum(["Normal text", "Title", "Heading", "Subheading"]).describe("Paragraph style to apply") },
  async ({ style }) => exec(commands.set_text_style, { style })
);

server.tool(
  "insert_link",
  "Insert a hyperlink on the currently selected text",
  { url: z.string().describe("URL to link to") },
  async ({ url }) => exec(commands.insert_link, { url })
);

server.tool(
  "insert_button",
  "Insert a clickable button element with a label and link",
  {
    name: z.string().describe("Button label text"),
    link: z.string().describe("URL the button links to"),
  },
  async ({ name, link }) => exec(commands.insert_button, { name, link })
);

server.tool(
  "insert_divider",
  "Insert a horizontal divider line in the page",
  {},
  async () => exec(commands.insert_divider)
);

server.tool(
  "insert_spacer",
  "Insert vertical spacing between content sections",
  {},
  async () => exec(commands.insert_spacer)
);

server.tool(
  "insert_embed",
  "Embed external content from a URL or raw embed code",
  {
    url: z.string().optional().describe("URL to embed (e.g., YouTube, Google Maps)"),
    embedCode: z.string().optional().describe("Raw HTML embed code (alternative to URL)"),
  },
  async ({ url, embedCode }) => exec(commands.insert_embed, { url, embedCode })
);

server.tool(
  "insert_image",
  "Open the image picker to insert an image into the page",
  {},
  async () => exec(commands.insert_image)
);

server.tool(
  "insert_collapsible_group",
  "Insert a collapsible/accordion group into the page",
  {},
  async () => exec(commands.insert_collapsible_group)
);

server.tool(
  "insert_table_of_contents",
  "Insert a table of contents into the page",
  {},
  async () => exec(commands.insert_table_of_contents)
);

server.tool(
  "insert_image_carousel",
  "Insert an image carousel into the page",
  {},
  async () => exec(commands.insert_image_carousel)
);

// --- Page Management Tools ---

server.tool(
  "add_page",
  "Add a new page to the site",
  { name: z.string().describe("Name of the new page") },
  async ({ name }) => exec(commands.add_page, { name })
);

server.tool(
  "list_pages",
  "List all pages in the current site",
  {},
  async () => exec(commands.list_pages)
);

// --- Header Tools ---

server.tool(
  "set_header_type",
  "Set the page header type",
  { type: z.enum(["Cover", "Large banner", "Banner", "Title only"]).describe("Header type") },
  async ({ type }) => exec(commands.set_header_type, { type })
);

server.tool(
  "delete_header",
  "Delete the page header entirely",
  {},
  async () => exec(commands.delete_header)
);

// --- Section Tools ---

server.tool(
  "delete_section",
  "Delete the currently selected section from the page",
  {},
  async () => exec(commands.delete_section)
);

server.tool(
  "duplicate_section",
  "Duplicate the currently selected section",
  {},
  async () => exec(commands.duplicate_section)
);

server.tool(
  "set_section_color",
  "Set the background color scheme for the selected section",
  { color: z.string().describe("Color name or number (1-4)") },
  async ({ color }) => exec(commands.set_section_color, { color })
);

// --- Theme Tools ---

server.tool(
  "set_theme",
  "Change the site theme (Simple, Aristotle, Diplomat, Vision, Level, Impression)",
  { theme: z.string().describe("Theme name to apply") },
  async ({ theme }) => exec(commands.set_theme, { theme })
);

server.tool(
  "set_theme_color",
  "Set the color variant for the current theme",
  { color: z.string().describe("Color name or number (1-7)") },
  async ({ color }) => exec(commands.set_theme_color, { color })
);

// --- Editor Action Tools ---

server.tool(
  "undo",
  "Undo the last editing action",
  {},
  async () => exec(commands.undo)
);

server.tool(
  "redo",
  "Redo the last undone action",
  {},
  async () => exec(commands.redo)
);

server.tool(
  "preview_site",
  "Enter preview mode to see how the site looks to visitors",
  {},
  async () => exec(commands.preview_site)
);

server.tool(
  "exit_preview",
  "Exit preview mode and return to the editor",
  {},
  async () => exec(commands.exit_preview)
);

// --- Settings & Info Tools ---

server.tool(
  "open_settings",
  "Open the site settings dialog (navigation, brand images, analytics, etc.)",
  {},
  async () => exec(commands.open_settings)
);

server.tool(
  "get_site_info",
  "Get current site info: title, site name, page title, save status, URL",
  {},
  async () => exec(commands.get_site_info)
);

// =============================================================================
// RUN SCRIPT — Execute arbitrary JavaScript in the page context
// =============================================================================

server.tool(
  "run_script",
  "Execute arbitrary JavaScript in the target app's page context. All learned helper functions are available. Use for batch operations or when specific tools fail.",
  {
    script: z.string().describe("JavaScript code to execute in the page. Runs inside an async IIFE. Use `return` to send back results. All command helpers are pre-injected."),
  },
  async ({ script }) => {
    try {
      const p = await getPage();
      const currentUrl = p.url();
      if (!URL_PATTERN.test(currentUrl)) {
        return {
          content: [{ type: "text", text: JSON.stringify({
            success: false,
            error: `Not on a ${APP_NAME} page. Current URL: ${currentUrl}`,
          }) }],
          isError: true,
        };
      }
      const result = await p.evaluate(
        new Function(`return (async () => { ${script} })();`)
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result ?? { success: true }, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: error.message }) }],
        isError: true,
      };
    }
  }
);

// --- Start Server ---

const transport = new StdioServerTransport();
await server.connect(transport);
