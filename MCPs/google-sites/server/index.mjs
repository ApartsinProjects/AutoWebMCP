#!/usr/bin/env node
// =============================================================================
// Auto-generated MCP Server for: google-sites
// Target: https://sites.google.com
// Generated: 2026-03-08
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

// --- Browser Connection ---

let browser = null;
let page = null;

async function getPage() {
  if (page && !page.isClosed()) return page;

  if (BROWSER_MODE === "headless" && DATA_MODE === "sandbox") {
    // Headless + Sandbox: launch a fresh headless browser with no user data
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    page = await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  } else if (BROWSER_MODE === "headless" && DATA_MODE === "user") {
    // Headless + User: launch headless using user's Chrome profile
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
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  } else if (BROWSER_MODE === "visible" && DATA_MODE === "sandbox") {
    // Visible + Sandbox: launch visible browser with clean profile
    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox"],
    });
    page = await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  } else {
    // Visible + User (default): connect to user's running Chrome via CDP
    const wsEndpoint = process.env.BROWSER_WS_ENDPOINT;
    const cdpUrl = process.env.CHROME_CDP_URL || "http://127.0.0.1:9222";

    if (wsEndpoint) {
      browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
    } else {
      browser = await puppeteer.connect({ browserURL: cdpUrl });
    }

    const pages = await browser.pages();
    page = pages.find((p) => URL_PATTERN.test(p.url()));

    if (!page) {
      page = await browser.newPage();
      await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
    }
  }

  return page;
}

// --- Command Execution Helper ---

async function exec(fnBody, params = {}) {
  try {
    const p = await getPage();
    // Inject utility functions and the command function, then execute
    const result = await p.evaluate(
      new Function("params", `
        ${commands.querySelector.toString()}
        ${commands.querySelectorAll.toString()}
        ${commands.waitForElement.toString()}
        ${commands.waitForRemoval.toString()}
        ${commands.setInputValue.toString()}
        ${commands.sleep.toString()}
        const fn = ${fnBody.toString()};
        return fn(params);
      `),
      params
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: JSON.stringify({ success: false, error: error.message }) }],
      isError: true,
    };
  }
}

// --- MCP Server ---

const server = new McpServer({
  name: "google-sites-mcp",
  version: "1.0.0",
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
    const fns = [...src.matchAll(/export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)\s*\{/g)];
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
  "Set the site title (shown in browser tab and site header)",
  { title: z.string().describe("The new site title") },
  async ({ title }) => exec(commands.set_site_title, { title })
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
  "insert_button",
  "Insert a clickable button element with a label and link",
  {
    name: z.string().describe("Button label text (max 120 chars)"),
    link: z.string().describe("URL the button links to"),
  },
  async ({ name, link }) => exec(commands.insert_button, { name, link })
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
  "insert_image",
  "Open the image picker to insert an image into the page",
  {},
  async () => exec(commands.insert_image)
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

// --- Theme Tools ---

server.tool(
  "set_theme",
  "Change the site theme (Simple, Aristotle, Diplomat, Vision, etc.)",
  { theme: z.string().describe("Theme name to apply") },
  async ({ theme }) => exec(commands.set_theme, { theme })
);

// --- Editor Actions ---

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

// --- Settings & Info ---

server.tool(
  "open_settings",
  "Open the site settings dialog (navigation, brand images, analytics, etc.)",
  {},
  async () => exec(commands.open_settings)
);

server.tool(
  "get_site_info",
  "Get current site info: title, page title, save status, URL",
  {},
  async () => exec(commands.get_site_info)
);

server.tool(
  "list_insert_options",
  "List all available insert options from the sidebar",
  {},
  async () => exec(commands.list_insert_options)
);

// --- Start Server ---

const transport = new StdioServerTransport();
await server.connect(transport);
