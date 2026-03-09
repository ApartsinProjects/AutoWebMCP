#!/usr/bin/env node
// =============================================================================
// Auto-generated MCP Server for: google-forms
// Target: https://docs.google.com/forms/
// Generated: 2026-03-09
// Version: 1.0.0
// Framework: AutoWebMCP v0.1.0
// =============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import puppeteer from "puppeteer-core";
import { z } from "zod";
import * as commands from "./commands.mjs";

// --- Configuration ---

const APP_NAME = "google-forms";
const TARGET_URL = "https://docs.google.com/forms/u/0/";
const URL_PATTERN = /docs\.google\.com\/forms/;

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
          error: `Not on a Google Forms page. Current URL: ${currentUrl}`,
          category: "state_error",
          hint: `Navigate to ${TARGET_URL} first`,
        }) }],
        isError: true,
      };
    }
    const result = await p.evaluate(
      new Function(
        "params",
        `${fn.toString().replace(/^async function \w+/, "async function fn")}
        return fn(params);`
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
              : error.message.includes("timeout") || error.message.includes("Timeout")
              ? "timeout"
              : error.message.includes("precondition") || error.message.includes("not visible")
              ? "state_error"
              : "unknown",
          }),
        },
      ],
      isError: true,
    };
  }
}

// --- MCP Server ---

const server = new McpServer({
  name: "google-forms-mcp",
  version: "1.0.0",
});

// --- Health Check Tool ---

server.tool(
  "health_check",
  "Check connectivity to Google Forms editor",
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

// --- Show Scripts Tool ---

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

// =============================================================================
// LEARNED OPERATIONS
// =============================================================================

// --- Data Retrieval ---

server.tool(
  "get_form_info",
  "Get current form title, description, URL, question count, and save status",
  {},
  async () => await exec(commands.get_form_info)
);

server.tool(
  "list_forms",
  "List recent forms from the homepage",
  {},
  async () => await exec(commands.list_forms)
);

server.tool(
  "get_response_count",
  "Get the number of form responses",
  {},
  async () => await exec(commands.get_response_count)
);

// --- Form Creation ---

server.tool(
  "create_form",
  "Create a new blank form from the homepage",
  {},
  async () => await exec(commands.create_form)
);

server.tool(
  "create_form_from_template",
  "Create a form from a named template (e.g., Customer Feedback, Contact Information, RSVP)",
  { template: z.string().describe("Template name (e.g., 'Customer Feedback', 'RSVP', 'Job Application')") },
  async ({ template }) => await exec(commands.create_form_from_template, { template })
);

server.tool(
  "open_form",
  "Open an existing form by name from the homepage",
  { name: z.string().describe("Name or partial name of the form to open") },
  async ({ name }) => await exec(commands.open_form, { name })
);

// --- Form Header ---

server.tool(
  "set_form_title",
  "Set the form title (large heading in the form header)",
  { title: z.string().describe("The new form title text") },
  async ({ title }) => await exec(commands.set_form_title, { title })
);

server.tool(
  "set_form_description",
  "Set the form description text below the title",
  { description: z.string().describe("The form description text") },
  async ({ description }) => await exec(commands.set_form_description, { description })
);

server.tool(
  "set_document_title",
  "Set the document name shown in browser tab and Google Drive",
  { title: z.string().describe("The document title") },
  async ({ title }) => await exec(commands.set_document_title, { title })
);

// --- Question Management ---

server.tool(
  "add_question",
  "Add a new question to the form with optional text and type",
  {
    text: z.string().optional().describe("Question text"),
    type: z.string().optional().describe("Question type: short answer, paragraph, multiple choice, checkboxes, dropdown, file upload, linear scale, rating, multiple choice grid, checkbox grid, date, time"),
  },
  async ({ text, type }) => await exec(commands.add_question, { text, type })
);

server.tool(
  "set_question_text",
  "Set the text of the currently focused question",
  { text: z.string().describe("The question text") },
  async ({ text }) => await exec(commands.set_question_text, { text })
);

server.tool(
  "set_question_type",
  "Change the type of the currently focused question",
  { type: z.string().describe("Question type: short answer, paragraph, multiple choice, checkboxes, dropdown, file upload, linear scale, rating, multiple choice grid, checkbox grid, date, time") },
  async ({ type }) => await exec(commands.set_question_type, { type })
);

server.tool(
  "add_option",
  "Add an option to the currently focused multiple-choice/checkbox/dropdown question",
  { text: z.string().describe("Option text to add") },
  async ({ text }) => await exec(commands.add_option, { text })
);

server.tool(
  "toggle_required",
  "Toggle the Required switch on the currently focused question",
  {},
  async () => await exec(commands.toggle_required)
);

server.tool(
  "duplicate_question",
  "Duplicate the currently focused question",
  {},
  async () => await exec(commands.duplicate_question)
);

server.tool(
  "delete_question",
  "Delete the currently focused question",
  {},
  async () => await exec(commands.delete_question)
);

// --- Form Structure ---

server.tool(
  "add_section",
  "Add a new section divider to the form",
  {},
  async () => await exec(commands.add_section)
);

server.tool(
  "add_title_description",
  "Add a title and description block to the form",
  {},
  async () => await exec(commands.add_title_description)
);

// --- Theme ---

server.tool(
  "set_theme_color",
  "Set the form's accent color (opens theme panel, selects color, closes panel)",
  { color: z.string().describe("Color name: Red, Purple, Indigo, Blue, Teal, Cyan, Orange, Yellow, Green, Lime, Gray") },
  async ({ color }) => await exec(commands.set_theme_color, { color })
);

server.tool(
  "set_background_color",
  "Set the form's background color",
  { color: z.string().describe("Background: light, medium, dark, or gray") },
  async ({ color }) => await exec(commands.set_background_color, { color })
);

// --- Settings ---

server.tool(
  "toggle_quiz_mode",
  "Toggle 'Make this a quiz' in settings",
  {},
  async () => await exec(commands.toggle_quiz_mode)
);

server.tool(
  "set_collect_emails",
  "Set email collection mode in settings",
  { mode: z.string().describe("Mode: 'do not collect', 'verified', or 'responder input'") },
  async ({ mode }) => await exec(commands.set_collect_emails, { mode })
);

server.tool(
  "toggle_limit_responses",
  "Toggle 'Limit to 1 response' in settings",
  {},
  async () => await exec(commands.toggle_limit_responses)
);

server.tool(
  "set_confirmation_message",
  "Set the post-submission confirmation message",
  { message: z.string().describe("Confirmation message text") },
  async ({ message }) => await exec(commands.set_confirmation_message, { message })
);

// --- Navigation ---

server.tool(
  "preview_form",
  "Open the form preview in a new tab",
  {},
  async () => await exec(commands.preview_form)
);

server.tool(
  "undo",
  "Undo the last editing action",
  {},
  async () => await exec(commands.undo)
);

server.tool(
  "redo",
  "Redo the last undone action",
  {},
  async () => await exec(commands.redo)
);

server.tool(
  "navigate_tab",
  "Switch between Questions, Responses, and Settings tabs",
  { tab: z.string().describe("Tab name: questions, responses, or settings") },
  async ({ tab }) => await exec(commands.navigate_tab, { tab })
);

// --- Start Server ---

const transport = new StdioServerTransport();
await server.connect(transport);
