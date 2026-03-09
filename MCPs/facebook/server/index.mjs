#!/usr/bin/env node
// =============================================================================
// Auto-generated MCP Server for: facebook
// Target: https://www.facebook.com/
// Generated: 2026-03-09
// Framework: AutoWebMCP v0.2.0
// =============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import puppeteer from "puppeteer-core";
import { z } from "zod";

// Import the learned command library
import * as commands from "./commands.mjs";

// --- Configuration ---

const APP_NAME = "facebook";
const TARGET_URL = "https://www.facebook.com/";
const URL_PATTERN = /facebook\.com/;

// --- Mode Switches ---
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
  if (page && !page.isClosed()) {
    try {
      const url = page.url();
      if (URL_PATTERN.test(url)) return page;
    } catch { /* page reference is stale */ }
    page = null;
  }
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

    // Trusted click support
    if (result && result.__clickCoords) {
      const { x, y } = result.__clickCoords;
      await p.mouse.click(x, y);
      await new Promise(r => setTimeout(r, 500));
      if (result.__followUp) {
        result = await p.evaluate(new Function(`return (${result.__followUp})()`));
      } else {
        delete result.__clickCoords;
      }
    }

    // Hover support
    if (result && result.__hoverCoords) {
      const { x, y } = result.__hoverCoords;
      await p.mouse.move(x, y);
      await new Promise(r => setTimeout(r, result.__hoverDelay || 1500));
      if (result.__followUp) {
        result = await p.evaluate(new Function(`return (${result.__followUp})()`));
      } else {
        delete result.__hoverCoords;
        delete result.__hoverDelay;
      }
    }

    // Keyboard support
    if (result && result.__keyPress) {
      const keys = Array.isArray(result.__keyPress) ? result.__keyPress : [result.__keyPress];
      for (const key of keys) {
        await p.keyboard.press(key);
        await new Promise(r => setTimeout(r, 200));
      }
      if (result.__followUp) {
        result = await p.evaluate(new Function(`return (${result.__followUp})()`));
      } else {
        delete result.__keyPress;
      }
    }

    // Navigation support
    if (result && result.__navigate) {
      const targetUrl = result.__navigate;
      await p.goto(targetUrl, { waitUntil: "networkidle2", timeout: 30000 });
      _injectedPages.delete(p);
      await _injectHelpers(p);
      result = { success: true, navigatedTo: targetUrl };
    }

    // Post-execution URL re-check
    try {
      const postUrl = p.url();
      if (postUrl !== currentUrl && URL_PATTERN.test(postUrl)) {
        _injectedPages.delete(p);
        await _injectHelpers(p);
      }
    } catch { /* page may have navigated away */ }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  try {
    return await attempt();
  } catch (error) {
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

// --- Health Check Tool ---

server.tool(
  "health_check",
  "Check connectivity to Facebook",
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

// --- Page State Tool ---

server.tool(
  "get_page_state",
  "Get current page state: URL, active element, open dialogs/menus",
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

// --- Run Script Tool ---

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
// LEARNED OPERATIONS — Tool Registrations
// =============================================================================

server.tool(
  "search_facebook",
  "Search Facebook using the search bar",
  {
    query: z.string().describe("The search query text"),
  },
  async ({ query }) => {
    return await exec(commands.search_facebook, { query });
  }
);

server.tool(
  "open_notifications",
  "Open the Notifications panel",
  {},
  async () => {
    return await exec(commands.open_notifications);
  }
);

server.tool(
  "open_messenger",
  "Open the Messenger (Chats) panel",
  {},
  async () => {
    return await exec(commands.open_messenger);
  }
);

server.tool(
  "open_menu",
  "Open the account/apps Menu panel (grid icon in top-right)",
  {},
  async () => {
    return await exec(commands.open_menu);
  }
);

server.tool(
  "open_composer",
  "Open the Create Post composer dialog",
  {},
  async () => {
    return await exec(commands.open_composer);
  }
);

server.tool(
  "set_post_text",
  "Set text in the open post composer dialog (call open_composer first)",
  {
    text: z.string().describe("The post text content"),
  },
  async ({ text }) => {
    return await exec(commands.set_post_text, { text });
  }
);

server.tool(
  "close_dialog",
  "Close the topmost open dialog (notifications, messenger, composer, etc.)",
  {},
  async () => {
    return await exec(commands.close_dialog);
  }
);

server.tool(
  "navigate_to",
  "Navigate to a Facebook section (Friends, Marketplace, Groups, Saved, Memories, Reels, Feeds)",
  {
    section: z.string().describe("Section name: Friends, Marketplace, Groups, Saved, Memories, Reels, Feeds, etc."),
  },
  async ({ section }) => {
    return await exec(commands.navigate_to, { section });
  }
);

server.tool(
  "get_feed_posts",
  "Get visible feed posts with content and metadata",
  {
    count: z.number().optional().describe("Maximum number of posts to retrieve (default: 5)"),
  },
  async ({ count }) => {
    return await exec(commands.get_feed_posts, { count });
  }
);

server.tool(
  "like_post",
  "Like a post in the feed",
  {
    postIndex: z.number().optional().describe("0-based index of the post to like (default: 0)"),
  },
  async ({ postIndex }) => {
    return await exec(commands.like_post, { postIndex });
  }
);

server.tool(
  "react_to_post",
  "React to a post with a specific reaction (Like, Love, Care, Haha, Wow, Sad, Angry)",
  {
    reaction: z.string().describe("Reaction name: Like, Love, Care, Haha, Wow, Sad, or Angry"),
    postIndex: z.number().optional().describe("0-based index of the post (default: 0)"),
  },
  async ({ reaction, postIndex }) => {
    return await exec(commands.react_to_post, { reaction, postIndex });
  }
);

server.tool(
  "comment_on_post",
  "Click the comment input on a post to start writing a comment",
  {
    postIndex: z.number().optional().describe("0-based index of the post (default: 0)"),
  },
  async ({ postIndex }) => {
    return await exec(commands.comment_on_post, { postIndex });
  }
);

server.tool(
  "open_post_actions",
  "Open the three-dot actions menu for a post",
  {
    postIndex: z.number().optional().describe("0-based index of the post (default: 0)"),
  },
  async ({ postIndex }) => {
    return await exec(commands.open_post_actions, { postIndex });
  }
);

server.tool(
  "save_post",
  "Save a post to your Saved collection",
  {
    postIndex: z.number().optional().describe("0-based index of the post (default: 0)"),
  },
  async ({ postIndex }) => {
    return await exec(commands.save_post, { postIndex });
  }
);

server.tool(
  "hide_post",
  "Hide a post from the feed",
  {
    postIndex: z.number().optional().describe("0-based index of the post (default: 0)"),
  },
  async ({ postIndex }) => {
    return await exec(commands.hide_post, { postIndex });
  }
);

server.tool(
  "scroll_feed",
  "Scroll the news feed up or down",
  {
    direction: z.string().optional().describe("Scroll direction: 'up' or 'down' (default: down)"),
    amount: z.number().optional().describe("Scroll distance in pixels (default: 800)"),
  },
  async ({ direction, amount }) => {
    return await exec(commands.scroll_feed, { direction, amount });
  }
);

server.tool(
  "get_notifications",
  "Open notifications panel and retrieve notification items",
  {},
  async () => {
    return await exec(commands.get_notifications);
  }
);

// --- Start Server ---

const transport = new StdioServerTransport();
await server.connect(transport);
