#!/usr/bin/env node
// =============================================================================
// Auto-generated MCP Server for: {{APP_NAME}}
// Target: {{TARGET_URL}}
// Generated: {{TIMESTAMP}}
// Framework: AutoWebMCP v0.1.0
// =============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import puppeteer from "puppeteer-core";
import { z } from "zod";

// Import the learned command library
import * as commands from "./commands.mjs";

// --- Configuration ---

const APP_NAME = "{{APP_NAME}}";
const TARGET_URL = "{{TARGET_URL}}";
const URL_PATTERN = /{{URL_PATTERN}}/;

// --- Mode Switches ---
// BROWSER_MODE: "visible" (attach to user's Chrome) or "headless" (launch headless)
// DATA_MODE: "user" (use user's Chrome profile) or "sandbox" (clean profile)
const BROWSER_MODE = process.env.BROWSER_MODE || "visible";
const DATA_MODE = process.env.DATA_MODE || "user";

// --- Browser Connection ---

let browser = null;
let page = null;

async function getPage() {
  if (page && !page.isClosed()) return page;

  if (BROWSER_MODE === "headless" && DATA_MODE === "sandbox") {
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    page = await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  } else if (BROWSER_MODE === "headless" && DATA_MODE === "user") {
    const userDataDir = process.env.CHROME_USER_DATA_DIR;
    if (!userDataDir) throw new Error("CHROME_USER_DATA_DIR required for headless+user mode");
    browser = await puppeteer.launch({ headless: true, userDataDir, args: ["--no-sandbox"] });
    page = await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  } else if (BROWSER_MODE === "visible" && DATA_MODE === "sandbox") {
    browser = await puppeteer.launch({ headless: false, args: ["--no-sandbox"] });
    page = await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  } else {
    // visible + user (default): attach to running Chrome via CDP
    const wsEndpoint = process.env.BROWSER_WS_ENDPOINT;
    const cdpUrl = process.env.CHROME_CDP_URL || "http://127.0.0.1:9222";
    if (wsEndpoint) {
      browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
    } else {
      browser = await puppeteer.connect({ browserURL: cdpUrl });
    }
    const pages = await browser.pages();
    page = pages.find(p => URL_PATTERN.test(p.url()));
    if (!page) {
      page = await browser.newPage();
      await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
    }
  }

  return page;
}

// --- Command Execution Helper ---
// Dynamically injects ALL exported functions from commands.mjs into the browser
// context via page.evaluate(). This ensures every helper function (utility or
// app-specific) is available to every tool — no hardcoded list to maintain.

// Build the helper source code ONCE at startup
const _helperSource = Object.entries(commands)
  .filter(([, v]) => typeof v === "function")
  .map(([, fn]) => fn.toString())
  .join("\n");

async function exec(fn, params = {}) {
  try {
    const p = await getPage();
    const result = await p.evaluate(
      new Function(
        "params",
        `
        ${_helperSource}
        ${fn.toString().replace(/^async function \w+/, "async function fn")}
        return fn(params);
      `
      ),
      params
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error.message,
            category: error.message.includes("not found")
              ? "selector_not_found"
              : error.message.includes("timeout")
              ? "timeout"
              : "cdp_error",
          }),
        },
      ],
      isError: true,
    };
  }
}

// --- MCP Server ---

const server = new McpServer({
  name: `${APP_NAME}-mcp`,
  version: "1.0.0",
});

// --- Health Check Tool (always present) ---

server.tool(
  "health_check",
  "Check if the target application is reachable and the MCP server can connect to it",
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
            connected: true,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ success: false, error: error.message }),
        }],
        isError: true,
      };
    }
  }
);

// =============================================================================
// SHOW SCRIPTS — Introspection tool (always present)
// =============================================================================

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

// =============================================================================
// LEARNED OPERATIONS — Register each as an MCP tool
// =============================================================================
// {{TOOL_REGISTRATIONS}}
//
// Each tool registration follows this pattern:
//
// server.tool(
//   "operation_name",
//   "Description of what the operation does",
//   {
//     param1: z.string().describe("Description of param1"),
//     param2: z.number().optional().describe("Optional param2"),
//   },
//   async ({ param1, param2 }) => {
//     return await exec(commands.operation_name, { param1, param2 });
//   }
// );
//
// =============================================================================

// --- Start Server ---

const transport = new StdioServerTransport();
await server.connect(transport);
