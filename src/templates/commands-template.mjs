// =============================================================================
// Auto-generated Command Library for: {{APP_NAME}}
// Target: {{TARGET_URL}}
// Generated: {{TIMESTAMP}}
// Framework: AutoWebMCP v0.2.0
//
// This module contains all learned operations as functions.
// Each function is designed to be executed in the browser page context
// via puppeteer's page.evaluate().
//
// CRITICAL: Every function MUST be exported — the exec() helper in index.mjs
// dynamically collects ALL exports and injects them into page.evaluate().
// =============================================================================

// --- Utility Functions (ALL MUST BE EXPORTED) ---

/**
 * Try multiple CSS selectors in order, return the first match.
 * Use this when an element might be identifiable by different selectors
 * across app versions or states. Order selectors by resilience (aria-label
 * first, CSS class last).
 *
 * @param {string[]} selectors - Array of CSS selectors to try in order.
 * @returns {HTMLElement|null} The first matching element, or null if none match.
 */
export function querySelector(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) return el;
    } catch (_) { /* invalid selector, skip */ }
  }
  return null;
}

/**
 * Try multiple CSS selectors in order, return all matches from the first
 * selector that produces results. Useful for collecting lists of items
 * (e.g., all menu items, all page entries).
 *
 * @param {string[]} selectors - Array of CSS selectors to try in order.
 * @returns {HTMLElement[]} Array of matching elements, or empty array.
 */
export function querySelectorAll(selectors) {
  for (const sel of selectors) {
    try {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) return Array.from(els);
    } catch (_) { /* invalid selector, skip */ }
  }
  return [];
}

/**
 * Like querySelector, but only returns the first *visible* match.
 * Critical for apps where multiple identical controls exist in the DOM
 * but only the active one is visible.
 *
 * Uses offsetHeight > 0 instead of offsetParent !== null because elements
 * with position:fixed (e.g., Facebook menus) have offsetParent === null
 * even when visible.
 *
 * Example: Google Forms has one set of buttons per question card, but only
 * the focused card's buttons are visible. querySelector('[aria-label="Delete"]')
 * returns the first (hidden) one; queryVisibleSelector returns the active one.
 *
 * @param {string|string[]} selectors - CSS selector or array of selectors to try.
 * @returns {HTMLElement|null} The first visible matching element, or null.
 */
export function queryVisibleSelector(selectors) {
  const sels = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of sels) {
    try {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el.offsetHeight > 0 && el.offsetWidth > 0) return el;
      }
    } catch (_) { /* invalid selector, skip */ }
  }
  return null;
}

/**
 * Run querySelector scoped to a specific root element instead of document.
 * Use when operating on a specific card, panel, or section to avoid matching
 * elements elsewhere on the page.
 *
 * Example: Find the radiogroup inside the currently selected theme card,
 * not any radiogroup on the page.
 *
 * @param {HTMLElement} root - The root element to scope the search within.
 * @param {string[]} selectors - Array of CSS selectors to try within root.
 * @returns {HTMLElement|null} The first matching child element, or null.
 */
export function querySelectorWithin(root, selectors) {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch (_) { /* invalid selector, skip */ }
  }
  return null;
}

/**
 * Wait for an element matching any of the given selectors to appear in the DOM.
 * Uses MutationObserver for efficiency (no polling). Resolves immediately if
 * the element already exists.
 *
 * Prefer this over sleep() after any click that triggers a DOM change.
 *
 * @param {string|string[]} selectors - CSS selector or array of selectors to wait for.
 * @param {number} [timeout=5000] - Maximum wait time in milliseconds.
 * @returns {Promise<HTMLElement>} Resolves with the found element.
 * @throws {Error} If timeout expires before any selector matches.
 */
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
        if (el) {
          observer.disconnect();
          return resolve(el);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for element: ${sels.join(", ")}`));
    }, timeout);
  });
}

/**
 * Wait for an element to be removed from the DOM. Uses MutationObserver.
 * Resolves immediately if the element doesn't exist.
 *
 * Useful after closing dialogs, dismissing overlays, or deleting elements.
 *
 * @param {string} selector - CSS selector for the element to wait for removal.
 * @param {number} [timeout=5000] - Maximum wait time in milliseconds.
 * @returns {Promise<void>} Resolves when the element is no longer in the DOM.
 * @throws {Error} If timeout expires while the element still exists.
 */
export function waitForRemoval(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (!document.querySelector(selector)) return resolve();
    const observer = new MutationObserver(() => {
      if (!document.querySelector(selector)) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for removal: ${selector}`));
    }, timeout);
  });
}

/**
 * Set a value on an <input> or <textarea> element using execCommand('insertText').
 * This works across React, Vue, Angular, Google Workspace apps, and vanilla HTML.
 *
 * Uses el.select() to select existing text before inserting — this only works on
 * native input/textarea elements. For contentEditable elements, use
 * setContentEditableValue() instead.
 *
 * @param {HTMLInputElement|HTMLTextAreaElement} el - Input or textarea element.
 * @param {string} value - The value to set.
 */
export function setInputValue(el, value) {
  el.focus();
  el.select();
  document.execCommand('insertText', false, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Set a value on a contentEditable element using selectAll + insertText.
 * Unlike setInputValue() which uses el.select() (only works on <input>/<textarea>),
 * this uses document.execCommand('selectAll') which works on contentEditable divs.
 *
 * Google Sites page titles, Google Forms title/description, and many rich text
 * editors use contentEditable. Use this function for those elements.
 *
 * Note: For Lexical-based editors (Facebook, some React apps), insertText works
 * but readback may be delayed. Use sleep(300) + el.textContent after calling this
 * to verify the value was accepted by the editor framework.
 *
 * @param {HTMLElement} el - A contentEditable element.
 * @param {string} value - The text value to insert (replaces all existing content).
 */
export function setContentEditableValue(el, value) {
  el.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Pause execution for a given number of milliseconds.
 *
 * Only use for: animation timing (sleep(200) after focus), debounce delay
 * before readback (sleep(300) after value set). NEVER as the sole wait
 * strategy after a click — use waitForElement() instead.
 *
 * @param {number} ms - Duration to pause in milliseconds.
 * @returns {Promise<void>} Resolves after the specified delay.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Click an element by its aria-label attribute. The label is sanitized with
 * CSS.escape to handle special characters safely.
 *
 * @param {string} label - The aria-label value to search for.
 * @returns {boolean} True if an element was found and clicked, false otherwise.
 */
export function clickByAriaLabel(label) {
  const el = document.querySelector(`[aria-label="${CSS.escape(label)}"]`);
  if (!el) return false;
  el.click();
  return true;
}

/**
 * Find a button element by its visible text content.
 * Searches native <button> elements first, then [role="button"] elements
 * (e.g., <div role="button"> used extensively in Google Sites).
 * Only returns visible elements (offsetHeight > 0).
 *
 * @param {string} text - Exact text content to match (trimmed, case-sensitive).
 * @returns {HTMLElement|null} First matching visible button, or null.
 */
export function findButtonByText(text) {
  for (const sel of ['button', '[role="button"]']) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      if (el.textContent.trim() === text && el.offsetHeight > 0) return el;
    }
  }
  return null;
}

/**
 * Find an element by its ARIA role and text content.
 * Useful when elements lack aria-labels but have consistent visible text.
 *
 * Supports both exact and partial (substring) matching, and optional
 * visibility filtering.
 *
 * @param {string} role - ARIA role to scope the search (e.g., "button", "tab", "option").
 * @param {string} text - Text content to match against (case-insensitive).
 * @param {Object} [options] - Match options.
 * @param {boolean} [options.partial=false] - If true, match substring instead of exact.
 * @param {boolean} [options.visible=true] - If true, skip hidden elements (offsetHeight === 0).
 * @returns {HTMLElement|null} The first matching element, or null.
 */
export function findElementByText(role, text, { partial = false, visible = true } = {}) {
  const els = document.querySelectorAll(`[role="${role}"]`);
  const target = text.toLowerCase();
  for (const el of els) {
    if (visible && !(el.offsetHeight > 0)) continue;
    const content = el.textContent.trim().toLowerCase();
    if (partial ? content.includes(target) : content === target) return el;
  }
  return null;
}

/**
 * Click a menu item by partial text match (case-insensitive).
 * Searches both [role="menuitem"] and [role="button"] within [role="menu"]
 * containers. Some apps (Facebook) use role="button" for menu items instead
 * of the standard role="menuitem". Only matches visible elements.
 *
 * @param {string} itemText - Partial text to match against menu item content.
 * @returns {boolean} True if a matching menu item was found and clicked, false otherwise.
 *
 * @note Some menu items require trusted (browser-level) clicks. If this function
 *       returns true but no effect occurs, the element may need __clickCoords.
 */
export function clickMenuItem(itemText) {
  const target = itemText.toLowerCase();
  // First try standard menuitem role
  for (const sel of ['[role="menuitem"]', '[role="menu"] [role="button"]']) {
    const items = document.querySelectorAll(sel);
    for (const item of items) {
      if (item.offsetHeight > 0 && item.textContent.trim().toLowerCase().includes(target)) {
        item.click();
        return true;
      }
    }
  }
  return false;
}

/**
 * Find a menu item element within any visible [role="menu"] by text match.
 * Returns the element without clicking it — useful when you need the element
 * reference for __clickCoords or further inspection.
 *
 * Searches both [role="menuitem"] and [role="button"] within visible menus,
 * since some apps (Facebook) use non-standard roles for menu items.
 *
 * @param {string} text - Partial text to match (case-insensitive).
 * @returns {HTMLElement|null} The matching menu item element, or null.
 */
export function findMenuItemByText(text) {
  const target = text.toLowerCase();
  const menus = document.querySelectorAll('[role="menu"]');
  for (const menu of menus) {
    if (!(menu.offsetHeight > 0)) continue;
    const items = menu.querySelectorAll('[role="menuitem"], [role="button"]');
    for (const item of items) {
      if (item.offsetHeight > 0 && item.textContent.trim().toLowerCase().includes(target)) {
        return item;
      }
    }
  }
  return null;
}

/**
 * Composite action: click an element, then wait for another element to appear.
 * Combines the two most common lines in learned operations into a single call.
 *
 * Example: Click a toolbar button and wait for its dialog to open.
 *   const dialog = await clickAndWait('[aria-label="Insert"]', '[role="dialog"]');
 *
 * @param {string|string[]} clickSelector - Selector(s) for the element to click.
 * @param {string|string[]} waitSelector - Selector(s) for the element to wait for after click.
 * @param {number} [timeout=5000] - Maximum time to wait for waitSelector in ms.
 * @returns {Promise<HTMLElement|null>} The awaited element, or null on failure.
 */
export async function clickAndWait(clickSelector, waitSelector, timeout = 5000) {
  const btn = querySelector(Array.isArray(clickSelector) ? clickSelector : [clickSelector]);
  if (!btn) return null;
  btn.click();
  return waitForElement(Array.isArray(waitSelector) ? waitSelector : [waitSelector], timeout).catch(() => null);
}

/**
 * Return diagnostic information about the current page state.
 * Reports the URL, document title, active (focused) element details,
 * and counts of visible dialogs and menus.
 *
 * Used by the built-in get_page_state MCP tool and available to learned
 * operations for precondition checks.
 *
 * @returns {Object} Page state object with url, title, activeElement, dialogs, menus.
 */
export function getPageState() {
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
    dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(d => d.offsetHeight > 0).length,
    menus: [...document.querySelectorAll('[role="menu"]')].filter(m => m.offsetHeight > 0).length,
  };
}

// --- Navigation & Compound Action Utilities (ALL MUST BE EXPORTED) ---

/**
 * Navigate to a URL within the same application.
 * Returns a __navigate signal that exec() intercepts to perform the navigation
 * at the puppeteer level, avoiding the race condition of setting
 * window.location.href inside page.evaluate().
 *
 * @param {string} url - The URL to navigate to.
 * @returns {Object} Navigation signal for exec() to intercept.
 */
export function navigateTo(url) {
  return { __navigate: url };
}

/**
 * Execute a sequence of click-and-wait steps in order.
 * Each step clicks an element and waits for a result element to appear.
 * Useful for multi-level menu navigation and cascading UI interactions.
 *
 * @param {Array<{click: string|string[], wait?: string|string[], delay?: number}>} steps
 * @returns {Promise<{success: boolean, completedSteps: number, error?: string}>}
 */
export async function multiStep(steps) {
  for (let i = 0; i < steps.length; i++) {
    const { click, wait, delay } = steps[i];
    const btn = querySelector(Array.isArray(click) ? click : [click]);
    if (!btn) return { success: false, error: `Step ${i + 1}: element not found`, completedSteps: i, category: 'selector_not_found' };
    btn.click();
    if (delay) await sleep(delay);
    if (wait) {
      try {
        await waitForElement(Array.isArray(wait) ? wait : [wait], 5000);
      } catch {
        return { success: false, error: `Step ${i + 1}: wait target not found`, completedSteps: i, category: 'timeout' };
      }
    }
  }
  return { success: true, completedSteps: steps.length };
}

// --- Feed / Repeating Content Utilities (ALL MUST BE EXPORTED) ---

/**
 * Find repeating content containers by walking up from anchor elements.
 * Used in feed-style apps (Facebook, Twitter, LinkedIn, Reddit) where posts/cards
 * don't have semantic roles but can be identified by common action buttons.
 *
 * Example: getRepeatingContainers('[aria-label="Like"]', 12, '[aria-label="Actions for this post"]')
 *
 * @param {string} anchorSelector - CSS selector for elements that mark containers.
 * @param {number} [maxLevels=12] - Maximum parent levels to walk up.
 * @param {string} [verifySelector] - Optional second selector that must also exist in the container.
 * @returns {HTMLElement[]} Array of unique container elements.
 */
export function getRepeatingContainers(anchorSelector, maxLevels = 12, verifySelector) {
  const anchors = document.querySelectorAll(anchorSelector);
  const containers = [];
  const seen = new WeakSet();
  for (const anchor of anchors) {
    let el = anchor;
    for (let i = 0; i < maxLevels; i++) {
      if (!el.parentElement) break;
      el = el.parentElement;
      if (verifySelector && el.querySelector(verifySelector) && !seen.has(el)) {
        seen.add(el);
        containers.push(el);
        break;
      }
    }
    if (!verifySelector && !seen.has(el)) {
      seen.add(el);
      containers.push(el);
    }
  }
  return containers;
}

// --- Menu & Settings Utilities (ALL MUST BE EXPORTED) ---

/**
 * Navigate through a cascade of menu items. Clicks each menu item in sequence,
 * waiting between clicks for the next level to appear.
 *
 * Example: menuCascade(["Settings & privacy", "Display & accessibility"])
 *
 * @param {string[]} itemTexts - Array of menu item text labels to click in order.
 * @param {number} [delay=500] - Delay between clicks in ms.
 * @returns {Promise<{success: boolean, completedSteps: number, error?: string}>}
 */
export async function menuCascade(itemTexts, delay = 500) {
  for (let i = 0; i < itemTexts.length; i++) {
    await sleep(delay);
    const items = document.querySelectorAll('[role="menuitem"], [role="option"], [role="button"]');
    let found = false;
    for (const item of items) {
      if (item.textContent.trim().includes(itemTexts[i]) && item.offsetHeight > 0) {
        item.click();
        found = true;
        break;
      }
    }
    if (!found) return { success: false, error: `Menu item "${itemTexts[i]}" not found`, completedSteps: i, category: 'selector_not_found' };
  }
  return { success: true, completedSteps: itemTexts.length };
}

/**
 * Select a radio button by index within a group, returning __clickCoords
 * for trusted browser-level click. Many radio buttons reject JS .click()
 * because they check event.isTrusted.
 *
 * @param {string|string[]} groupSelector - Selector(s) for radio buttons (e.g., '[role="radio"]').
 * @param {number} index - 0-based index of the radio to select.
 * @returns {Object} Either { __clickCoords } for exec() or { success: false, error }.
 */
export function selectRadioByIndex(groupSelector, index) {
  const radios = querySelectorAll(Array.isArray(groupSelector) ? groupSelector : [groupSelector]);
  if (index < 0 || index >= radios.length) {
    return { success: false, error: `Radio index ${index} out of range (${radios.length} found)`, category: 'selector_not_found' };
  }
  const target = radios[index];
  const rect = target.getBoundingClientRect();
  return {
    __clickCoords: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }
  };
}

/**
 * Toggle a panel (open if closed, close if open) with state detection.
 * Prevents double-toggle: checks if the panel is already in the desired state
 * before clicking the trigger.
 *
 * @param {string|string[]} triggerSelector - Selector(s) for the toggle button.
 * @param {string|string[]} panelSelector - Selector(s) for the panel element.
 * @param {string} [action="open"] - "open" or "close".
 * @returns {Promise<{success: boolean, state: string}>}
 */
export async function togglePanel(triggerSelector, panelSelector, action = "open") {
  const panelSels = Array.isArray(panelSelector) ? panelSelector : [panelSelector];
  const panel = querySelector(panelSels);
  const isOpen = panel && panel.offsetHeight > 0;
  if (action === "open" && isOpen) return { success: true, state: "already_open" };
  if (action === "close" && !isOpen) return { success: true, state: "already_closed" };
  const trigger = querySelector(Array.isArray(triggerSelector) ? triggerSelector : [triggerSelector]);
  if (!trigger) return { success: false, error: 'Toggle trigger not found', category: 'selector_not_found' };
  trigger.click();
  if (action === "open") {
    try {
      await waitForElement(panelSels, 3000);
      return { success: true, state: "opened" };
    } catch {
      return { success: false, error: 'Panel did not open', category: 'timeout' };
    }
  } else {
    try {
      await waitForRemoval(panelSels[0], 3000);
      return { success: true, state: "closed" };
    } catch {
      return { success: false, error: 'Panel did not close', category: 'timeout' };
    }
  }
}

// --- Content Extraction Utilities (ALL MUST BE EXPORTED) ---

/**
 * Extract clean text content from an element, handling rich text editors.
 * Detects Lexical ([data-lexical-text]), ProseMirror, Quill, and plain
 * contentEditable elements and extracts text appropriately.
 *
 * For Lexical editors (Facebook, some React apps), extracts text from
 * [data-lexical-text="true"] span elements. For other editors, uses
 * textContent with whitespace normalization.
 *
 * @param {HTMLElement} el - The element to extract text from.
 * @param {Object} [options] - Extraction options.
 * @param {boolean} [options.trim=true] - Trim leading/trailing whitespace.
 * @param {boolean} [options.normalize=true] - Collapse internal whitespace runs.
 * @returns {string} The extracted text content.
 */
export function extractTextContent(el, { trim = true, normalize = true } = {}) {
  let text;
  // Lexical editor (Facebook, modern React apps)
  const lexicalNodes = el.querySelectorAll('[data-lexical-text="true"]');
  if (lexicalNodes.length > 0) {
    text = Array.from(lexicalNodes).map(n => n.textContent).join('');
  }
  // ProseMirror (.ProseMirror class)
  else if (el.classList?.contains('ProseMirror') || el.querySelector('.ProseMirror')) {
    const pm = el.classList?.contains('ProseMirror') ? el : el.querySelector('.ProseMirror');
    text = pm.textContent;
  }
  // Default: plain textContent
  else {
    text = el.textContent;
  }
  if (trim) text = text.trim();
  if (normalize) text = text.replace(/\s+/g, ' ');
  return text;
}

// --- Error Recovery Utilities (ALL MUST BE EXPORTED) ---

/**
 * Try a primary action, and if it fails, try a fallback action.
 * Reduces boilerplate in generated commands where every tool has its own
 * try/catch/fallback logic.
 *
 * @param {Function} primary - Primary async function to try first.
 * @param {Function} fallback - Fallback async function if primary throws.
 * @param {number} [maxRetries=1] - Number of times to retry primary before fallback.
 * @returns {Promise<*>} Result of whichever function succeeds.
 * @throws {Error} If both primary and fallback fail, throws fallback's error.
 */
export async function retryWithFallback(primary, fallback, maxRetries = 1) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await primary();
    } catch (e) {
      lastError = e;
    }
  }
  return fallback();
}

// =============================================================================
// LEARNED OPERATIONS
// =============================================================================
// {{OPERATIONS}}
//
// Each operation is an exported async function that:
//   1. Checks preconditions (view state, element existence)
//   2. Executes the learned procedure
//   3. Verifies postconditions (readback verification for set operations)
//   4. Returns { success: boolean, ...result data }
//
// For elements requiring trusted clicks (isTrusted check), return __clickCoords:
//   const rect = el.getBoundingClientRect();
//   return {
//     success: true,
//     __clickCoords: { x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2) }
//   };
//
// Example:
//
// export async function compose_message({ to, subject, body }) {
//   const btn = querySelector(['[aria-label="Compose"]', '[data-action="compose"]']);
//   if (!btn) return { success: false, error: 'Compose button not found', category: 'selector_not_found' };
//   btn.click();
//   await waitForElement(['[role="dialog"]'], 3000);
//   // ... fill fields ...
//   return { success: true, message: 'Composed' };
// }
// =============================================================================
