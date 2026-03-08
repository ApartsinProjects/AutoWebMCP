// =============================================================================
// Auto-generated Command Library for: google-sites
// Target: https://sites.google.com
// Generated: 2026-03-08
// Framework: AutoWebMCP v0.1.0
//
// Each function is designed for execution via puppeteer page.evaluate()
// =============================================================================

// --- Utility Functions ---

export function querySelector(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) return el;
    } catch (_) {}
  }
  return null;
}

export function querySelectorAll(selectors) {
  for (const sel of selectors) {
    try {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) return Array.from(els);
    } catch (_) {}
  }
  return [];
}

export function waitForElement(selectors, timeout = 5000) {
  const sels = Array.isArray(selectors) ? selectors : [selectors];
  return new Promise((resolve, reject) => {
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el) return resolve(el);
    }
    const observer = new MutationObserver(() => {
      for (const sel of sels) {
        const el = document.querySelector(sel);
        if (el) { observer.disconnect(); return resolve(el); }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); reject(new Error("Timeout")); }, timeout);
  });
}

export function waitForRemoval(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (!document.querySelector(selector)) return resolve();
    const observer = new MutationObserver(() => {
      if (!document.querySelector(selector)) { observer.disconnect(); resolve(); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); reject(new Error("Timeout")); }, timeout);
  });
}

export function setInputValue(el, value) {
  const descriptor =
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value") ||
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  if (descriptor && descriptor.set) {
    descriptor.set.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clickByAriaLabel(label) {
  const el = document.querySelector(`[aria-label="${label}"]`);
  if (!el) return false;
  el.click();
  return true;
}

function getToolbarButton(label) {
  // Try aria-label first, then data-tooltip, then button text
  return querySelector([
    `[aria-label="${label}"]`,
    `[data-tooltip="${label}"]`,
    `button[title="${label}"]`,
  ]);
}

// =============================================================================
// LEARNED OPERATIONS
// =============================================================================

// --- Site-Level Operations ---

export async function set_site_title({ title }) {
  const input = querySelector([
    'input[aria-label="Site name"]',
    'input[placeholder="Enter site name"]',
    '.XKSfm-r4nke input',
  ]);
  if (!input) return { success: false, error: "Site name input not found" };
  input.focus();
  input.select();
  setInputValue(input, title);
  input.blur();
  await sleep(500);
  return { success: true, title };
}

export async function set_page_title({ title }) {
  // Click on the page title area to activate it
  const titleEl = querySelector([
    '[data-placeholder="Your page title"]',
    '.X4UxXd [contenteditable="true"]',
    'h1[contenteditable="true"]',
  ]);
  if (!titleEl) return { success: false, error: "Page title not found" };
  titleEl.focus();
  titleEl.click();
  await sleep(300);
  // Select all and replace
  document.execCommand("selectAll", false, null);
  document.execCommand("insertText", false, title);
  await sleep(300);
  return { success: true, title };
}

// --- Content Insertion Operations ---

export async function insert_text_box({ text, style }) {
  // Click "Text box" in the Insert sidebar
  const textBoxBtn = querySelector([
    '[data-tooltip="Text box"]',
    '[aria-label="Text box"]',
    '.jgXgSe [data-key="text"]',
  ]);
  if (!textBoxBtn) return { success: false, error: "Text box button not found in sidebar" };
  textBoxBtn.click();
  await sleep(800);

  // Type the text into the newly created text box
  if (text) {
    document.execCommand("insertText", false, text);
    await sleep(300);
  }

  return { success: true, message: "Text box inserted", text };
}

export async function set_text_content({ text }) {
  // Assumes a text element is currently selected/focused
  document.execCommand("selectAll", false, null);
  document.execCommand("insertText", false, text);
  await sleep(300);
  return { success: true, text };
}

export async function format_text({ format }) {
  // Applies formatting to currently selected text
  const formatMap = {
    bold: "bold",
    italic: "italic",
    underline: "underline",
  };
  const cmd = formatMap[format.toLowerCase()];
  if (!cmd) return { success: false, error: `Unknown format: ${format}. Use: bold, italic, underline` };
  document.execCommand(cmd, false, null);
  await sleep(200);
  return { success: true, format };
}

export async function insert_button({ name, link }) {
  const btnItem = querySelector([
    '[data-tooltip="Button"]',
    '[aria-label="Button"]',
  ]);
  if (!btnItem) return { success: false, error: "Button menu item not found" };
  btnItem.click();
  await sleep(800);

  // Fill the Name field
  const nameInput = querySelector([
    'input[aria-label="Name"]',
    '.d9ArSb input',
  ]);
  if (nameInput && name) {
    nameInput.focus();
    setInputValue(nameInput, name);
  }

  // Fill the Link field
  const linkInput = querySelector([
    'input[aria-label="Link"]',
    'input[placeholder="Link"]',
  ]);
  if (linkInput && link) {
    linkInput.focus();
    setInputValue(linkInput, link);
  }

  await sleep(300);

  // Click Insert
  const insertBtn = querySelector([
    'button[data-id="insert"]',
    '[aria-label="Insert"]',
  ]);
  // Try finding by text content
  if (!insertBtn) {
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      if (btn.textContent.trim() === "Insert") {
        btn.click();
        await sleep(500);
        return { success: true, name, link };
      }
    }
    return { success: false, error: "Insert button not found in dialog" };
  }
  insertBtn.click();
  await sleep(500);
  return { success: true, name, link };
}

export async function insert_embed({ url, embedCode }) {
  const embedBtn = querySelector([
    '[data-tooltip="Embed"]',
    '[aria-label="Embed"]',
  ]);
  if (!embedBtn) return { success: false, error: "Embed button not found" };
  embedBtn.click();
  await sleep(800);

  if (embedCode) {
    // Switch to Embed code tab
    const tabs = document.querySelectorAll('[role="tab"]');
    for (const tab of tabs) {
      if (tab.textContent.includes("Embed code")) {
        tab.click();
        await sleep(300);
        break;
      }
    }
    const textarea = querySelector(["textarea", ".eKPF7e textarea"]);
    if (textarea) {
      textarea.focus();
      setInputValue(textarea, embedCode);
    }
  } else if (url) {
    const urlInput = querySelector([
      'input[placeholder="Enter URL"]',
      'input[aria-label="Enter URL"]',
      ".eKPF7e input",
    ]);
    if (urlInput) {
      urlInput.focus();
      setInputValue(urlInput, url);
    }
  }

  await sleep(300);
  // Click Insert/Next
  const buttons = document.querySelectorAll("button");
  for (const btn of buttons) {
    if (btn.textContent.trim() === "Insert") {
      btn.click();
      await sleep(500);
      return { success: true, url, embedCode: !!embedCode };
    }
  }
  return { success: false, error: "Insert button not found" };
}

export async function insert_divider() {
  const btn = querySelector([
    '[data-tooltip="Divider"]',
    '[aria-label="Divider"]',
  ]);
  if (!btn) return { success: false, error: "Divider button not found" };
  btn.click();
  await sleep(500);
  return { success: true, element: "divider" };
}

export async function insert_spacer() {
  const btn = querySelector([
    '[data-tooltip="Spacer"]',
    '[aria-label="Spacer"]',
  ]);
  if (!btn) return { success: false, error: "Spacer button not found" };
  btn.click();
  await sleep(500);
  return { success: true, element: "spacer" };
}

export async function insert_image() {
  const btn = querySelector([
    '[data-tooltip="Images"]',
    '[aria-label="Images"]',
  ]);
  if (!btn) return { success: false, error: "Images button not found" };
  btn.click();
  await sleep(500);
  return { success: true, message: "Image picker opened — select an image from the dialog" };
}

// --- Page Management Operations ---

export async function add_page({ name }) {
  // Switch to Pages tab
  const pagesTab = querySelector([
    '[aria-label="Pages"]',
    '[data-tooltip="Pages"]',
    'div[role="tab"]:nth-child(2)',
  ]);
  if (pagesTab) pagesTab.click();
  await sleep(500);

  // Click "New page" button
  const newPageBtn = querySelector([
    '[aria-label="New page"]',
    'button[data-tooltip="New page"]',
  ]);
  // Fallback: look for the "+" FAB button
  if (!newPageBtn) {
    const fabs = document.querySelectorAll('[aria-label="New page"], .VfPpkd-Bz112c-LgbsSe');
    if (fabs.length === 0) return { success: false, error: "New page button not found" };
    fabs[fabs.length - 1].click();
  } else {
    newPageBtn.click();
  }
  await sleep(800);

  // Fill name
  const nameInput = querySelector([
    'input[aria-label="Page title"]',
    'input[placeholder="Name"]',
  ]);
  if (nameInput && name) {
    nameInput.focus();
    setInputValue(nameInput, name);
  }

  // Click Done
  const buttons = document.querySelectorAll("button");
  for (const btn of buttons) {
    if (btn.textContent.trim() === "Done") {
      btn.click();
      await sleep(500);
      return { success: true, page: name };
    }
  }
  return { success: false, error: "Done button not found" };
}

export async function list_pages() {
  // Switch to Pages tab
  const pagesTab = querySelector([
    '[aria-label="Pages"]',
    '[data-tooltip="Pages"]',
  ]);
  if (pagesTab) pagesTab.click();
  await sleep(500);

  const pageItems = querySelectorAll([
    '[role="treeitem"]',
    '.asa1zb',
  ]);
  const pages = pageItems.map((item) => {
    const label = item.textContent.trim();
    return { name: label };
  });
  return { success: true, pages };
}

// --- Theme Operations ---

export async function set_theme({ theme }) {
  // Switch to Themes tab
  const themesTab = querySelector([
    '[aria-label="Themes"]',
    '[data-tooltip="Themes"]',
  ]);
  if (themesTab) themesTab.click();
  await sleep(500);

  // Find theme by name
  const themeCards = document.querySelectorAll('[role="listbox"] [role="option"], .e2FQNc');
  for (const card of themeCards) {
    if (card.textContent.toLowerCase().includes(theme.toLowerCase())) {
      card.click();
      await sleep(1000);
      return { success: true, theme };
    }
  }
  return { success: false, error: `Theme "${theme}" not found` };
}

// --- Navigation/Toolbar Operations ---

export async function undo() {
  const btn = querySelector([
    '[aria-label="Undo last action"]',
    '[data-tooltip="Undo"]',
  ]);
  if (!btn) return { success: false, error: "Undo button not found" };
  btn.click();
  await sleep(300);
  return { success: true, action: "undo" };
}

export async function redo() {
  const btn = querySelector([
    '[aria-label="Redo last action"]',
    '[data-tooltip="Redo"]',
  ]);
  if (!btn) return { success: false, error: "Redo button not found" };
  btn.click();
  await sleep(300);
  return { success: true, action: "redo" };
}

export async function preview_site() {
  const btn = querySelector([
    '[aria-label="Preview"]',
    '[data-tooltip="Preview"]',
  ]);
  if (!btn) return { success: false, error: "Preview button not found" };
  btn.click();
  await sleep(1000);
  return { success: true, action: "preview" };
}

export async function exit_preview() {
  const btn = querySelector([
    '[aria-label="Exit preview"]',
    'a[aria-label="Back"]',
  ]);
  if (btn) { btn.click(); await sleep(500); }
  return { success: true, action: "exit_preview" };
}

export async function delete_section() {
  // Assumes a section is currently selected
  const btn = querySelector([
    '[aria-label="Delete section"]',
    '[aria-label="Delete header"]',
    '[data-tooltip="Delete section"]',
  ]);
  if (!btn) return { success: false, error: "No section selected or delete button not found" };
  btn.click();
  await sleep(300);
  return { success: true, action: "delete_section" };
}

export async function duplicate_section() {
  const btn = querySelector([
    '[aria-label="Duplicate section"]',
    '[aria-label="Duplicate"]',
  ]);
  if (!btn) return { success: false, error: "No section selected or duplicate button not found" };
  btn.click();
  await sleep(500);
  return { success: true, action: "duplicate_section" };
}

// --- Settings Operations ---

export async function open_settings() {
  const btn = querySelector([
    '[aria-label="Settings"]',
    '[data-tooltip="Settings"]',
  ]);
  if (!btn) return { success: false, error: "Settings button not found" };
  btn.click();
  await sleep(800);
  return { success: true, action: "settings_opened" };
}

// --- Data Retrieval ---

export async function get_site_info() {
  const titleInput = querySelector([
    'input[aria-label="Untitled site"]',
    '.XKSfm-r4nke input',
    'input[type="text"]',
  ]);
  const siteTitle = titleInput ? titleInput.value : "unknown";

  const pageTitle = querySelector([
    '[data-placeholder="Your page title"]',
    'h1[contenteditable="true"]',
  ]);
  const pageTitleText = pageTitle ? pageTitle.textContent.trim() : "unknown";

  const saveStatus = querySelector([
    '.XKSfm-Bz112c',
    '[data-save-status]',
  ]);
  const status = saveStatus ? saveStatus.textContent.trim() : "unknown";

  return {
    success: true,
    siteTitle,
    pageTitle: pageTitleText,
    saveStatus: status,
    url: window.location.href,
  };
}

export async function list_insert_options() {
  const items = querySelectorAll([
    '[role="menuitem"]',
    '.jgXgSe [role="menuitem"]',
  ]);
  const options = items.map((item) => item.textContent.trim()).filter(Boolean);
  return { success: true, options };
}
