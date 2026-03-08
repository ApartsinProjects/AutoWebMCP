// =============================================================================
// Auto-generated Command Library for: google-sites
// Target: https://sites.google.com
// Generated: 2026-03-08
// Version: 2.0.0
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
    setTimeout(() => { observer.disconnect(); reject(new Error("Timeout waiting for element")); }, timeout);
  });
}

export function waitForRemoval(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (!document.querySelector(selector)) return resolve();
    const observer = new MutationObserver(() => {
      if (!document.querySelector(selector)) { observer.disconnect(); resolve(); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); reject(new Error("Timeout waiting for removal")); }, timeout);
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

function findButtonByText(text) {
  const buttons = document.querySelectorAll("button");
  for (const btn of buttons) {
    if (btn.textContent.trim() === text) return btn;
  }
  return null;
}

function clickSidebarTab(tabName) {
  const tabs = document.querySelectorAll('[role="tab"]');
  for (const tab of tabs) {
    if (tab.textContent.trim() === tabName) {
      tab.click();
      return true;
    }
  }
  return false;
}

function clickMenuItem(itemText) {
  const items = document.querySelectorAll('[role="menuitem"]');
  for (const item of items) {
    if (item.textContent.trim().toLowerCase().includes(itemText.toLowerCase())) {
      item.click();
      return true;
    }
  }
  return false;
}

// =============================================================================
// LEARNED OPERATIONS
// =============================================================================

// --- Site-Level Operations ---

/**
 * Set the site title shown in the browser tab and top bar
 */
export async function set_site_title({ title }) {
  // The top bar site name is an input without aria-label; find it by current value or position
  const inputs = document.querySelectorAll('input[type="text"]');
  let input = null;
  for (const inp of inputs) {
    // The site title input is in the top bar, not inside the editor canvas
    if (inp.closest('[role="banner"]') || inp.closest('header') || !inp.getAttribute('aria-label')) {
      if (inp.value === 'Untitled site' || inp.offsetWidth > 100) {
        input = inp;
        break;
      }
    }
  }
  // Fallback: first text input that's not the site name field
  if (!input) input = inputs[0];
  if (!input) return { success: false, error: "Site title input not found" };
  input.focus();
  input.select();
  setInputValue(input, title);
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  input.blur();
  await sleep(500);
  return { success: true, title };
}

/**
 * Set the site name displayed in the hero/header area
 */
export async function set_site_name({ name }) {
  const input = querySelector([
    'input[aria-label="Site name"]',
    'input[placeholder="Enter site name"]',
  ]);
  if (!input) return { success: false, error: "Site name input not found in header" };
  input.focus();
  input.select();
  setInputValue(input, name);
  input.blur();
  await sleep(500);
  return { success: true, name };
}

/**
 * Set the page title in the hero section
 */
export async function set_page_title({ title }) {
  // Find the page title textbox
  const textboxes = document.querySelectorAll('[role="textbox"][aria-label="Text"]');
  let titleEl = null;
  for (const tb of textboxes) {
    if (tb.textContent === "Your page title" || tb.closest('[aria-label="Page header section"]')) {
      titleEl = tb;
      break;
    }
  }
  if (!titleEl) titleEl = textboxes[0];
  if (!titleEl) return { success: false, error: "Page title element not found" };

  titleEl.click();
  await sleep(300);
  titleEl.focus();
  await sleep(200);
  document.execCommand("selectAll", false, null);
  document.execCommand("insertText", false, title);
  await sleep(300);
  return { success: true, title };
}

// --- Content Insertion Operations ---

/**
 * Insert a new text box with optional content
 */
export async function insert_text_box({ text, style }) {
  // Ensure Insert tab is active
  clickSidebarTab("Insert");
  await sleep(300);

  const textBoxBtn = querySelector([
    '[data-tooltip="Text box"]',
    '[aria-label="Text box"]',
  ]);
  if (!textBoxBtn) {
    // Try menuitem fallback
    if (!clickMenuItem("Text box")) {
      return { success: false, error: "Text box button not found" };
    }
  } else {
    textBoxBtn.click();
  }
  await sleep(800);

  if (text) {
    document.execCommand("insertText", false, text);
    await sleep(300);
  }

  return { success: true, message: "Text box inserted", text };
}

/**
 * Replace the content of the currently selected/focused text element
 */
export async function set_text_content({ text }) {
  document.execCommand("selectAll", false, null);
  document.execCommand("insertText", false, text);
  await sleep(300);
  return { success: true, text };
}

/**
 * Apply bold, italic, or underline formatting to selected text
 */
export async function format_text({ format }) {
  const formatMap = { bold: "bold", italic: "italic", underline: "underline" };
  const cmd = formatMap[format.toLowerCase()];
  if (!cmd) return { success: false, error: `Unknown format: ${format}. Use: bold, italic, underline` };
  document.execCommand(cmd, false, null);
  await sleep(200);
  return { success: true, format };
}

/**
 * Set paragraph style: Normal text, Title, Heading, or Subheading
 */
export async function set_text_style({ style }) {
  // Click the style dropdown (shows "Normal text", "Title", etc.)
  const styleDropdown = querySelector([
    '[aria-label="Styles"]',
    'select[aria-label="Styles"]',
    '[role="listbox"][aria-label="Styles"]',
  ]);
  if (!styleDropdown) return { success: false, error: "Style dropdown not found. Select a text element first." };

  styleDropdown.click();
  await sleep(400);

  // Find and click the matching option
  const options = document.querySelectorAll('[role="option"]');
  for (const opt of options) {
    if (opt.textContent.toLowerCase().includes(style.toLowerCase())) {
      opt.click();
      await sleep(300);
      return { success: true, style };
    }
  }
  return { success: false, error: `Style "${style}" not found. Available: Normal text, Title, Heading, Subheading` };
}

/**
 * Insert a hyperlink on selected text
 */
export async function insert_link({ url }) {
  const linkBtn = querySelector([
    '[aria-label="Insert link"]',
    '[data-tooltip="Insert link"]',
  ]);
  if (!linkBtn) return { success: false, error: "Insert link button not found. Select text first." };
  linkBtn.click();
  await sleep(600);

  // Find the URL input in the link dialog
  const urlInput = querySelector([
    'input[aria-label="Link"]',
    'input[placeholder*="link"]',
    'input[placeholder*="URL"]',
    'input[type="url"]',
  ]);
  if (!urlInput) return { success: false, error: "Link URL input not found" };
  urlInput.focus();
  setInputValue(urlInput, url);
  await sleep(300);

  // Press Enter or click Apply
  const applyBtn = findButtonByText("Apply");
  if (applyBtn) {
    applyBtn.click();
  } else {
    urlInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  }
  await sleep(300);
  return { success: true, url };
}

/**
 * Insert a clickable button element with a label and link
 */
export async function insert_button({ name, link }) {
  clickSidebarTab("Insert");
  await sleep(300);

  if (!clickMenuItem("Button")) {
    return { success: false, error: "Button menu item not found" };
  }
  await sleep(800);

  // Fill Name field
  const nameInput = querySelector([
    'input[aria-label="Name"]',
    'input[placeholder="Name"]',
  ]);
  if (nameInput && name) {
    nameInput.focus();
    setInputValue(nameInput, name);
  }

  // Fill Link field
  const linkInput = querySelector([
    'input[aria-label="Link"]',
    'input[placeholder="Link"]',
  ]);
  if (linkInput && link) {
    linkInput.focus();
    setInputValue(linkInput, link);
  }

  await sleep(300);

  const insertBtn = findButtonByText("Insert");
  if (insertBtn) {
    insertBtn.click();
    await sleep(500);
    return { success: true, name, link };
  }
  return { success: false, error: "Insert button not found in dialog" };
}

/**
 * Insert a horizontal divider line
 */
export async function insert_divider() {
  clickSidebarTab("Insert");
  await sleep(300);
  if (!clickMenuItem("Divider")) {
    return { success: false, error: "Divider button not found" };
  }
  await sleep(500);
  return { success: true, element: "divider" };
}

/**
 * Insert vertical spacing between content sections
 */
export async function insert_spacer() {
  clickSidebarTab("Insert");
  await sleep(300);
  if (!clickMenuItem("Spacer")) {
    return { success: false, error: "Spacer button not found" };
  }
  await sleep(500);
  return { success: true, element: "spacer" };
}

/**
 * Embed external content from a URL or embed code
 */
export async function insert_embed({ url, embedCode }) {
  clickSidebarTab("Insert");
  await sleep(300);

  if (!clickMenuItem("Embed")) {
    return { success: false, error: "Embed button not found" };
  }
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
    const textarea = querySelector(["textarea"]);
    if (textarea) {
      textarea.focus();
      setInputValue(textarea, embedCode);
    }
  } else if (url) {
    const urlInput = querySelector([
      'input[placeholder*="URL"]',
      'input[aria-label*="URL"]',
    ]);
    if (urlInput) {
      urlInput.focus();
      setInputValue(urlInput, url);
    }
  }

  await sleep(300);
  const insertBtn = findButtonByText("Insert") || findButtonByText("Next");
  if (insertBtn) {
    insertBtn.click();
    await sleep(500);
    return { success: true, url, embedCode: !!embedCode };
  }
  return { success: false, error: "Insert button not found" };
}

/**
 * Open the image picker to insert an image
 */
export async function insert_image() {
  clickSidebarTab("Insert");
  await sleep(300);

  const btn = querySelector([
    '[data-tooltip="Images"]',
    '[aria-label="Images"]',
  ]);
  if (!btn) {
    if (!clickMenuItem("Images")) {
      return { success: false, error: "Images button not found" };
    }
  } else {
    btn.click();
  }
  await sleep(500);
  return { success: true, message: "Image picker opened — select an image from the dialog" };
}

/**
 * Insert a collapsible/accordion group
 */
export async function insert_collapsible_group() {
  clickSidebarTab("Insert");
  await sleep(300);
  if (!clickMenuItem("Collapsible group")) {
    return { success: false, error: "Collapsible group button not found" };
  }
  await sleep(500);
  return { success: true, element: "collapsible_group" };
}

/**
 * Insert a table of contents
 */
export async function insert_table_of_contents() {
  clickSidebarTab("Insert");
  await sleep(300);
  if (!clickMenuItem("Table of contents")) {
    return { success: false, error: "Table of contents button not found" };
  }
  await sleep(500);
  return { success: true, element: "table_of_contents" };
}

/**
 * Insert an image carousel
 */
export async function insert_image_carousel() {
  clickSidebarTab("Insert");
  await sleep(300);
  if (!clickMenuItem("Image carousel")) {
    return { success: false, error: "Image carousel button not found" };
  }
  await sleep(500);
  return { success: true, message: "Image carousel inserted — add images via the carousel editor" };
}

// --- Page Management Operations ---

/**
 * Add a new page to the site
 */
export async function add_page({ name }) {
  clickSidebarTab("Pages");
  await sleep(500);

  // Click the + (New page) FAB button
  const newPageBtn = querySelector([
    '[aria-label="New page"]',
    '[data-tooltip="New page"]',
  ]);
  if (!newPageBtn) {
    // Look for any FAB-style button in the pages panel
    const fabs = document.querySelectorAll('.VfPpkd-Bz112c-LgbsSe');
    if (fabs.length === 0) return { success: false, error: "New page button not found" };
    fabs[fabs.length - 1].click();
  } else {
    newPageBtn.click();
  }
  await sleep(800);

  // Fill page name
  const nameInput = querySelector([
    'input[aria-label="Page title"]',
    'input[placeholder*="Name"]',
  ]);
  if (nameInput && name) {
    nameInput.focus();
    setInputValue(nameInput, name);
  }

  // Click Done
  const doneBtn = findButtonByText("Done");
  if (doneBtn) {
    doneBtn.click();
    await sleep(500);
    return { success: true, page: name };
  }
  return { success: false, error: "Done button not found" };
}

/**
 * List all pages in the current site
 */
export async function list_pages() {
  clickSidebarTab("Pages");
  await sleep(500);

  const pageItems = querySelectorAll([
    '[role="treeitem"]',
    '.asa1zb',
  ]);
  const pages = pageItems.map((item) => ({
    name: item.textContent.trim(),
  }));
  return { success: true, pages };
}

// --- Header Operations ---

/**
 * Set the header type: Cover, Large banner, Banner, or Title only
 */
export async function set_header_type({ type }) {
  // Click on the header area to select it
  const headerSection = querySelector([
    '[aria-label="Page header section"]',
  ]);
  if (headerSection) headerSection.click();
  await sleep(300);

  // Click "Header type" button
  const headerTypeBtn = querySelector([
    '[aria-label="Header type"]',
    '[data-tooltip="Header type"]',
  ]);
  if (!headerTypeBtn) return { success: false, error: "Header type button not found. Click on the header first." };
  headerTypeBtn.click();
  await sleep(400);

  // Find and click the matching type option
  const options = document.querySelectorAll('[role="option"], [role="radio"], [role="menuitemradio"]');
  for (const opt of options) {
    if (opt.textContent.toLowerCase().includes(type.toLowerCase())) {
      opt.click();
      await sleep(500);
      return { success: true, type };
    }
  }
  // Fallback: look for buttons/items with the type name
  const allElements = document.querySelectorAll('button, [role="button"]');
  for (const el of allElements) {
    if (el.textContent.trim().toLowerCase() === type.toLowerCase()) {
      el.click();
      await sleep(500);
      return { success: true, type };
    }
  }
  return { success: false, error: `Header type "${type}" not found. Use: Cover, Large banner, Banner, Title only` };
}

/**
 * Delete the page header
 */
export async function delete_header() {
  const btn = querySelector([
    '[aria-label="Delete header"]',
    '[data-tooltip="Delete header"]',
  ]);
  if (!btn) return { success: false, error: "Delete header button not found. Click on the header first." };
  btn.click();
  await sleep(300);
  return { success: true, action: "header_deleted" };
}

// --- Section Operations ---

/**
 * Delete the currently selected section
 */
export async function delete_section() {
  const btn = querySelector([
    '[aria-label="Delete section"]',
    '[data-tooltip="Delete section"]',
  ]);
  if (!btn) return { success: false, error: "No section selected or delete button not found" };
  btn.click();
  await sleep(300);
  return { success: true, action: "section_deleted" };
}

/**
 * Duplicate the currently selected section
 */
export async function duplicate_section() {
  const btn = querySelector([
    '[aria-label="Duplicate section"]',
    '[data-tooltip="Duplicate section"]',
  ]);
  if (!btn) return { success: false, error: "No section selected or duplicate button not found" };
  btn.click();
  await sleep(500);
  return { success: true, action: "section_duplicated" };
}

/**
 * Set the background color scheme for the selected section
 */
export async function set_section_color({ color }) {
  // Click section colors button
  const btn = querySelector([
    '[aria-label="Section colors"]',
    '[data-tooltip="Section colors"]',
  ]);
  if (!btn) return { success: false, error: "Section colors button not found. Select a section first." };
  btn.click();
  await sleep(400);

  // Find the color option — colors are typically presented as radio buttons or option tiles
  const colorOptions = document.querySelectorAll('[role="option"], [role="radio"], [role="menuitemradio"]');
  for (const opt of colorOptions) {
    const label = (opt.getAttribute('aria-label') || opt.textContent || '').toLowerCase();
    if (label.includes(color.toLowerCase())) {
      opt.click();
      await sleep(300);
      return { success: true, color };
    }
  }
  // Try clicking by index if color is a number (1-based)
  const idx = parseInt(color);
  if (!isNaN(idx) && idx >= 1 && idx <= colorOptions.length) {
    colorOptions[idx - 1].click();
    await sleep(300);
    return { success: true, color: `option ${idx}` };
  }
  return { success: false, error: `Color "${color}" not found. Try a number (1-4) or color name.` };
}

// --- Theme Operations ---

/**
 * Change the site theme
 */
export async function set_theme({ theme }) {
  clickSidebarTab("Themes");
  await sleep(500);

  // Find theme by name in the themes list
  const allElements = document.querySelectorAll('[role="option"], [role="radio"], button');
  for (const el of allElements) {
    const text = el.textContent.trim().toLowerCase();
    if (text === theme.toLowerCase() || text.includes(theme.toLowerCase())) {
      // Make sure it's in the themes panel, not elsewhere
      if (el.closest('[role="tabpanel"]') || el.closest('[aria-label*="heme"]')) {
        el.click();
        await sleep(1000);
        return { success: true, theme };
      }
    }
  }
  return { success: false, error: `Theme "${theme}" not found. Available: Simple, Aristotle, Diplomat, Vision, Level, Impression` };
}

/**
 * Set the color variant for the current theme
 */
export async function set_theme_color({ color }) {
  clickSidebarTab("Themes");
  await sleep(500);

  // Color options appear as small circular buttons under the selected theme
  // They typically have aria-label describing the color
  const colorBtns = document.querySelectorAll('[role="radio"], [role="option"]');
  for (const btn of colorBtns) {
    const label = (btn.getAttribute('aria-label') || btn.getAttribute('data-tooltip') || '').toLowerCase();
    if (label.includes(color.toLowerCase())) {
      btn.click();
      await sleep(500);
      return { success: true, color };
    }
  }
  // Try by index
  const idx = parseInt(color);
  if (!isNaN(idx) && idx >= 1) {
    // Filter to only color option buttons (small circular ones)
    const colorOptions = Array.from(colorBtns).filter(b => b.offsetWidth < 50 && b.offsetWidth > 10);
    if (idx <= colorOptions.length) {
      colorOptions[idx - 1].click();
      await sleep(500);
      return { success: true, color: `option ${idx}` };
    }
  }
  return { success: false, error: `Theme color "${color}" not found. Try a number (1-7) or color name.` };
}

// --- Editor Navigation Operations ---

/**
 * Undo the last editing action
 */
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

/**
 * Redo the last undone action
 */
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

/**
 * Enter preview mode to see how the site looks to visitors
 */
export async function preview_site() {
  const btn = querySelector([
    '[aria-label="Preview"]',
    '[data-tooltip="Preview"]',
  ]);
  if (!btn) return { success: false, error: "Preview button not found" };
  btn.click();
  await sleep(1000);
  return { success: true, action: "preview_entered" };
}

/**
 * Exit preview mode and return to the editor
 */
export async function exit_preview() {
  const btn = querySelector([
    '[aria-label="Exit preview"]',
    'a[aria-label="Back"]',
  ]);
  if (btn) {
    btn.click();
    await sleep(500);
    return { success: true, action: "preview_exited" };
  }
  // Fallback: look for back arrow or close button
  const closeBtn = querySelector([
    'button[aria-label="Close"]',
    '.preview-close',
  ]);
  if (closeBtn) {
    closeBtn.click();
    await sleep(500);
  }
  return { success: true, action: "preview_exited" };
}

// --- Settings & Info Operations ---

/**
 * Open the site settings dialog
 */
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

/**
 * Get current site info: title, page title, save status, URL
 */
export async function get_site_info() {
  // Site title from top bar input
  const inputs = document.querySelectorAll('input[type="text"]');
  let siteTitle = "unknown";
  for (const inp of inputs) {
    if (!inp.getAttribute('aria-label') && inp.value && inp.offsetWidth > 50) {
      siteTitle = inp.value;
      break;
    }
  }

  // Site name from hero
  const siteNameInput = document.querySelector('input[aria-label="Site name"]');
  const siteName = siteNameInput ? siteNameInput.value || siteNameInput.placeholder : "unknown";

  // Page title from first textbox in header section
  const textboxes = document.querySelectorAll('[role="textbox"][aria-label="Text"]');
  let pageTitle = "unknown";
  if (textboxes.length > 0) {
    pageTitle = textboxes[0].textContent.trim() || "empty";
  }

  // Save status
  const statusEl = document.querySelector('[data-save-status]');
  const saveStatus = statusEl ? statusEl.textContent.trim() :
    document.body.textContent.includes("All changes saved") ? "All changes saved" : "unknown";

  return {
    success: true,
    siteTitle,
    siteName,
    pageTitle,
    saveStatus,
    url: window.location.href,
  };
}
