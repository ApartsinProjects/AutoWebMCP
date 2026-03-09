#!/usr/bin/env node
// =============================================================================
// Auto-generated MCP Server for: {{APP_NAME}}
// Target: {{TARGET_URL}}
// Generated: {{TIMESTAMP}}
// Framework: AutoWebMCP v0.2.0
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

// --- Helper Injection ---
// Build the injection payload ONCE at startup. Declares all exported functions
// from commands.mjs and assigns them to window.* for global access.
// Uses CDP evaluate (Runtime.callFunctionOn) to bypass Trusted Types CSP.

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
  // Inject into current document (CDP Runtime.callFunctionOn — bypasses CSP)
  await p.evaluate(_helperInjection);
  // Auto-re-inject on future navigations (CDP Page.addScriptToEvaluateOnNewDocument)
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
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    page = await browser.newPage();
    await _injectHelpers(page);
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  } else if (BROWSER_MODE === "headless" && DATA_MODE === "user") {
    const userDataDir = process.env.CHROME_USER_DATA_DIR;
    if (!userDataDir) throw new Error("CHROME_USER_DATA_DIR required for headless+user mode");
    browser = await puppeteer.launch({ headless: true, userDataDir, args: ["--no-sandbox"] });
    page = await browser.newPage();
    await _injectHelpers(page);
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  } else if (BROWSER_MODE === "visible" && DATA_MODE === "sandbox") {
    browser = await puppeteer.launch({ headless: false, args: ["--no-sandbox"] });
    page = await browser.newPage();
    await _injectHelpers(page);
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  } else {
    // visible + user (default): attach to running Chrome via CDP
    const wsEndpoint = process.env.BROWSER_WS_ENDPOINT;
    const cdpUrl = process.env.CHROME_CDP_URL || "http://127.0.0.1:9222";
    if (wsEndpoint) {
      browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint, protocolTimeout: 120_000 });
    } else {
      browser = await puppeteer.connect({ browserURL: cdpUrl, protocolTimeout: 120_000 });
    }
    const pages = await browser.pages();
    page = pages.find(p => URL_PATTERN.test(p.url()));
    if (!page) {
      page = await browser.newPage();
      await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
    }
    await _injectHelpers(page);
  }

  return page;
}

// --- Command Execution Helper ---
//
// Features:
// - __clickCoords: When a command returns { __clickCoords: {x,y} }, exec() uses
//   puppeteer page.mouse.click() for a trusted browser-level click (isTrusted=true).
//   Needed for widgets that reject JS .click() (radio buttons, some menuitems).
// - __followUp: Optional function string to evaluate after a trusted click.
// - Retry: On first failure, re-injects helpers and retries once (catches navigation
//   that cleared injected functions).
// - URL re-check: After execution, if URL changed within the app, re-injects helpers.

async function exec(fn, params = {}) {
  let retried = false;

  async function attempt() {
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
      new Function(
        "params",
        `${fn.toString().replace(/^async function \w+/, "async function fn")}
        return fn(params);`
      ),
      params
    );

    // Trusted click support: when a command returns __clickCoords, use puppeteer's
    // page.mouse.click() which produces isTrusted=true events. This is required for
    // widgets that check event.isTrusted (radio buttons, some menuitems in Google apps).
    if (result && result.__clickCoords) {
      const { x, y } = result.__clickCoords;
      await p.mouse.click(x, y);
      await new Promise(r => setTimeout(r, 500));
      // Optional: re-evaluate a follow-up function after the trusted click
      if (result.__followUp) {
        result = await p.evaluate(new Function(`return (${result.__followUp})()`));
      } else {
        delete result.__clickCoords;
      }
    }

    // Post-execution URL re-check: some operations navigate within the app
    // (e.g., Forms homepage -> editor). Re-inject helpers if URL changed.
    try {
      const postUrl = p.url();
      if (postUrl !== currentUrl && URL_PATTERN.test(postUrl)) {
        _injectedPages.delete(p);
        await _injectHelpers(p);
      }
    } catch { /* page may have navigated away entirely */ }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  try {
    return await attempt();
  } catch (error) {
    // Single retry with helper re-injection on failure.
    // Catches cases where navigation cleared the injected functions.
    if (!retried) {
      retried = true;
      try {
        const p = await getPage();
        _injectedPages.delete(p);
        await _injectHelpers(p);
        return await attempt();
      } catch (retryError) {
        error = retryError;
      }
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: false,
          error: error.message,
          category: error.message.includes("not found")
            ? "selector_not_found"
            : error.message.includes("timeout")
            ? "timeout"
            : error.message.includes("precondition") || error.message.includes("not visible")
            ? "state_error"
            : "unknown",
        }),
      }],
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
  "Check connectivity to {{APP_NAME}} editor",
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
        content: [{
          type: "text",
          text: JSON.stringify({ success: false, error: error.message }),
        }],
        isError: true,
      };
    }
  }
);

// --- Page State Tool (always present) ---
// Returns current page diagnostics: URL, active element, open dialogs/menus.
// Inlines its logic — does NOT depend on helper injection succeeding.

server.tool(
  "get_page_state",
  "Get current page state: URL, active element, open dialogs/menus. Useful for debugging tool failures.",
  {},
  async () => {
    try {
      const p = await getPage();
      const state = await p.evaluate(() => {
        const active = document.activeElement;
        return {
          url: window.location.href,
          title: document.title,
          activeElement: active ? {
            tag: active.tagName,
            role: active.getAttribute('role'),
            ariaLabel: active.getAttribute('aria-label'),
            editable: active.isContentEditable || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA',
          } : null,
          dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(d => d.offsetParent !== null).length,
          menus: [...document.querySelectorAll('[role="menu"]')].filter(m => m.offsetParent !== null).length,
        };
      });
      return {
        content: [{ type: "text", text: JSON.stringify(state, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: error.message }) }],
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

// =============================================================================
// RUN SCRIPT — Execute arbitrary JavaScript in the page context (always present)
// =============================================================================
// Escape hatch: when learned tools fail or a task needs custom logic,
// run a raw JS script through the existing CDP connection.
// All helper functions from commands.mjs are injected automatically.

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
