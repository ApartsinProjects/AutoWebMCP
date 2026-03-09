// =============================================================================
// Auto-generated Command Library for: facebook
// Target: https://www.facebook.com/
// Generated: 2026-03-09
// Framework: AutoWebMCP v0.2.0
//
// This module contains all learned operations as functions.
// Each function is designed to be executed in the browser page context
// via puppeteer's page.evaluate().
//
// CRITICAL: Every function MUST be exported — the exec() helper in index.mjs
// dynamically collects ALL exports and injects them into page.evaluate().
//
// NOTE: Facebook uses obfuscated/hashed CSS classes (e.g., x9f619, xh8yej3).
// CSS class selectors are unusable — all operations rely on aria-label, role,
// and text content matching.
// =============================================================================

// --- Utility Functions (ALL MUST BE EXPORTED) ---

/**
 * Try multiple CSS selectors in order, return the first match.
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
 * selector that produces results.
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
 * Like querySelector, but only returns the first *visible* match
 * (offsetParent !== null).
 * @param {string|string[]} selectors - CSS selector or array of selectors to try.
 * @returns {HTMLElement|null} The first visible matching element, or null.
 */
export function queryVisibleSelector(selectors) {
  const sels = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of sels) {
    try {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el.offsetParent !== null) return el;
      }
    } catch (_) { /* invalid selector, skip */ }
  }
  return null;
}

/**
 * Run querySelector scoped to a specific root element.
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
 * @param {string|string[]} selectors - CSS selector or array of selectors.
 * @param {number} [timeout=5000] - Maximum wait time in milliseconds.
 * @returns {Promise<HTMLElement>} Resolves with the found element.
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
 * Wait for an element to be removed from the DOM.
 * @param {string} selector - CSS selector for the element.
 * @param {number} [timeout=5000] - Maximum wait time in milliseconds.
 * @returns {Promise<void>}
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
 * Set a value on an <input> or <textarea> element.
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
 * @param {HTMLElement} el - A contentEditable element.
 * @param {string} value - The text value to insert.
 */
export function setContentEditableValue(el, value) {
  el.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Pause execution for a given number of milliseconds.
 * Only use for animation timing, never as primary wait strategy.
 * @param {number} ms - Duration to pause in milliseconds.
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Click an element by its aria-label attribute.
 * @param {string} label - The aria-label value to search for.
 * @returns {boolean} True if clicked, false otherwise.
 */
export function clickByAriaLabel(label) {
  const el = document.querySelector(`[aria-label="${CSS.escape(label)}"]`);
  if (!el) return false;
  el.click();
  return true;
}

/**
 * Find a button element by its visible text content.
 * Searches <button> and [role="button"], only returns visible matches.
 * @param {string} text - Exact text content to match (trimmed).
 * @returns {HTMLElement|null} First matching visible button, or null.
 */
export function findButtonByText(text) {
  for (const sel of ['button', '[role="button"]']) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      if (el.textContent.trim() === text && el.offsetParent !== null) return el;
    }
  }
  return null;
}

/**
 * Find an element by its ARIA role and text content.
 * @param {string} role - ARIA role to scope the search.
 * @param {string} text - Text content to match (case-insensitive).
 * @param {Object} [options]
 * @param {boolean} [options.partial=false] - Match substring instead of exact.
 * @param {boolean} [options.visible=true] - Skip hidden elements.
 * @returns {HTMLElement|null}
 */
export function findElementByText(role, text, { partial = false, visible = true } = {}) {
  const els = document.querySelectorAll(`[role="${role}"]`);
  const target = text.toLowerCase();
  for (const el of els) {
    if (visible && el.offsetParent === null) continue;
    const content = el.textContent.trim().toLowerCase();
    if (partial ? content.includes(target) : content === target) return el;
  }
  return null;
}

/**
 * Click a menu item by partial text match (case-insensitive).
 * @param {string} itemText - Partial text to match.
 * @returns {boolean} True if clicked, false otherwise.
 */
export function clickMenuItem(itemText) {
  const items = document.querySelectorAll('[role="menuitem"]');
  for (const item of items) {
    if (item.textContent.trim().toLowerCase().includes(itemText.toLowerCase())) {
      item.click();
      return true;
    }
  }
  return false;
}

/**
 * Composite: click an element, then wait for another to appear.
 * @param {string|string[]} clickSelector - Selector(s) to click.
 * @param {string|string[]} waitSelector - Selector(s) to wait for.
 * @param {number} [timeout=5000] - Wait timeout in ms.
 * @returns {Promise<HTMLElement|null>}
 */
export async function clickAndWait(clickSelector, waitSelector, timeout = 5000) {
  const btn = querySelector(Array.isArray(clickSelector) ? clickSelector : [clickSelector]);
  if (!btn) return null;
  btn.click();
  return waitForElement(Array.isArray(waitSelector) ? waitSelector : [waitSelector], timeout).catch(() => null);
}

/**
 * Return diagnostic information about the current page state.
 * @returns {Object} Page state with url, title, activeElement, dialogs, menus.
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
    dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(d => d.offsetParent !== null).length,
    menus: [...document.querySelectorAll('[role="menu"]')].filter(m => m.offsetParent !== null).length,
  };
}

/**
 * Navigate to a URL, returning a signal for exec() to intercept.
 * @param {string} url - The URL to navigate to.
 * @returns {Object} Navigation signal.
 */
export function navigateTo(url) {
  return { __navigate: url };
}

/**
 * Execute a sequence of click-and-wait steps.
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

/**
 * Find repeating content containers by walking up from anchor elements.
 * Used in feed-style apps where posts don't have semantic roles.
 * @param {string} anchorSelector - Selector for elements that mark containers.
 * @param {number} [maxLevels=12] - Maximum parent levels to walk up.
 * @param {string} [verifySelector] - Second selector that must exist in container.
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

/**
 * Navigate cascading menus by clicking items in sequence.
 * @param {string[]} itemTexts - Menu item labels to click in order.
 * @param {number} [delay=500] - Delay between clicks in ms.
 * @returns {Promise<{success: boolean, completedSteps: number, error?: string}>}
 */
export async function menuCascade(itemTexts, delay = 500) {
  for (let i = 0; i < itemTexts.length; i++) {
    await sleep(delay);
    const items = document.querySelectorAll('[role="menuitem"], [role="option"], [role="button"]');
    let found = false;
    for (const item of items) {
      if (item.textContent.trim().includes(itemTexts[i]) && item.offsetParent !== null) {
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
 * Toggle a panel open or closed with state detection.
 * @param {string|string[]} triggerSelector - Selector(s) for the toggle button.
 * @param {string|string[]} panelSelector - Selector(s) for the panel element.
 * @param {string} [action="open"] - "open" or "close".
 * @returns {Promise<{success: boolean, state: string}>}
 */
export async function togglePanel(triggerSelector, panelSelector, action = "open") {
  const panelSels = Array.isArray(panelSelector) ? panelSelector : [panelSelector];
  const panel = querySelector(panelSels);
  const isOpen = panel && panel.offsetParent !== null;
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

// =============================================================================
// APP-SPECIFIC HELPERS (ALL MUST BE EXPORTED)
// =============================================================================

/**
 * Get feed post containers from the news feed.
 * Facebook posts are identified by the "Actions for this post" button.
 * Walks up the DOM from each button to find the containing post element.
 * @param {number} [maxPosts=10] - Maximum number of posts to return.
 * @returns {HTMLElement[]} Array of post container elements.
 */
export function getFeedPosts(maxPosts = 10) {
  const actionBtns = document.querySelectorAll('[aria-label="Actions for this post"]');
  const posts = [];
  const seen = new WeakSet();
  for (const btn of actionBtns) {
    if (posts.length >= maxPosts) break;
    // Walk up to find the post container — look for an element that also
    // contains a Like or reaction button as verification
    let el = btn;
    for (let i = 0; i < 15; i++) {
      if (!el.parentElement) break;
      el = el.parentElement;
      // A good post container should contain both the actions button and
      // like/comment controls
      const hasLike = el.querySelector('[aria-label="Like"]') || el.querySelector('[aria-label="Like this post"]');
      const hasActions = el.querySelector('[aria-label="Actions for this post"]');
      if (hasLike && hasActions && !seen.has(el)) {
        seen.add(el);
        posts.push(el);
        break;
      }
    }
  }
  return posts;
}

/**
 * Get a specific post by index (0-based) from the visible feed.
 * @param {number} [index=0] - 0-based index of the post.
 * @returns {HTMLElement|null} The post container element, or null.
 */
export function getPostByIndex(index = 0) {
  const posts = getFeedPosts(index + 1);
  return posts[index] || null;
}

/**
 * Extract text content and metadata from a post container.
 * @param {HTMLElement} post - A post container element.
 * @returns {Object} Post data with author, text, and available actions.
 */
export function extractPostData(post) {
  // Find author link — typically the first strong > a or h-tag > a within the post
  const links = post.querySelectorAll('a[role="link"]');
  let author = '';
  for (const link of links) {
    const text = link.textContent.trim();
    // Author links tend to be short (just a name) and near the top
    if (text && text.length < 80 && text.length > 1) {
      author = text;
      break;
    }
  }

  // Find post text content — look for [data-ad-preview="message"] or the
  // largest text block within the post body
  const textEls = post.querySelectorAll('[data-ad-preview="message"], [dir="auto"]');
  let postText = '';
  let maxLen = 0;
  for (const el of textEls) {
    const t = el.textContent.trim();
    if (t.length > maxLen) {
      maxLen = t.length;
      postText = t;
    }
  }

  return {
    author,
    text: postText.substring(0, 500),
    hasLike: !!post.querySelector('[aria-label="Like"]'),
    hasComment: !!post.querySelector('[aria-label="Leave a comment"]'),
    hasActions: !!post.querySelector('[aria-label="Actions for this post"]'),
  };
}

// =============================================================================
// LEARNED OPERATIONS
// =============================================================================

/**
 * Search Facebook using the search bar.
 * Focuses the search combobox, types the query, and submits with Enter.
 * @param {Object} params
 * @param {string} params.query - The search query text.
 * @returns {Object} Result with __keyPress for Enter submission.
 */
export async function search_facebook({ query }) {
  const searchBox = querySelector([
    '[aria-label="Search Facebook"]',
    '[role="combobox"][aria-label="Search Facebook"]',
  ]);
  if (!searchBox) {
    return { success: false, error: 'Search box not found', category: 'selector_not_found' };
  }
  searchBox.focus();
  searchBox.click();
  await sleep(300);
  // Clear existing text and type query
  setInputValue(searchBox, query);
  await sleep(300);
  const readback = searchBox.value;
  if (readback !== query) {
    return { success: false, error: `Readback mismatch: expected "${query}", got "${readback}"`, category: 'state_error' };
  }
  return {
    success: true,
    query,
    __keyPress: 'Enter',
  };
}

/**
 * Open the Notifications panel.
 * @returns {Object} Result indicating success or failure.
 */
export async function open_notifications() {
  const btn = querySelector([
    '[aria-label="Notifications"]',
  ]);
  if (!btn) {
    return { success: false, error: 'Notifications button not found', category: 'selector_not_found' };
  }
  btn.click();
  try {
    await waitForElement('[role="dialog"][aria-label="Notifications"]', 5000);
    return { success: true };
  } catch {
    // Dialog might use different aria-label — check for any new dialog
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(d => d.offsetParent !== null);
    if (dialogs.length > 0) return { success: true };
    return { success: false, error: 'Notifications panel did not open', category: 'timeout' };
  }
}

/**
 * Open the Messenger (Chats) panel.
 * @returns {Object} Result indicating success or failure.
 */
export async function open_messenger() {
  const btn = querySelector([
    '[aria-label="Messenger"]',
  ]);
  if (!btn) {
    return { success: false, error: 'Messenger button not found', category: 'selector_not_found' };
  }
  btn.click();
  try {
    await waitForElement('[aria-label="Search Messenger"]', 5000);
    return { success: true };
  } catch {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(d => d.offsetParent !== null);
    if (dialogs.length > 0) return { success: true };
    return { success: false, error: 'Messenger panel did not open', category: 'timeout' };
  }
}

/**
 * Open the account/apps Menu panel (grid icon in top-right).
 * @returns {Object} Result indicating success or failure.
 */
export async function open_menu() {
  const btn = querySelector([
    '[aria-label="Menu"]',
  ]);
  if (!btn) {
    return { success: false, error: 'Menu button not found', category: 'selector_not_found' };
  }
  btn.click();
  await sleep(500);
  const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(d => d.offsetParent !== null);
  if (dialogs.length > 0) return { success: true };
  return { success: false, error: 'Menu panel did not open', category: 'timeout' };
}

/**
 * Open the Create Post composer dialog.
 * Clicks the composer input area which opens the full post creation dialog.
 * @returns {Object} Result with __clickCoords for trusted click.
 */
export async function open_composer() {
  // The composer trigger is typically a div with text like "What's on your mind"
  // or an element with role="button" near the create-post area
  const trigger = querySelector([
    '[aria-label="Create a post"]',
    '[role="button"][aria-label="Create a post"]',
  ]);
  if (trigger) {
    const rect = trigger.getBoundingClientRect();
    return {
      success: true,
      __clickCoords: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) },
      __followUp: `(async function() {
        await new Promise(r => setTimeout(r, 1500));
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog && dialog.offsetParent !== null) return { success: true };
        return { success: false, error: 'Composer dialog did not open', category: 'timeout' };
      })`,
    };
  }

  // Fallback: look for the "What's on your mind" text prompt
  const spans = document.querySelectorAll('span');
  for (const span of spans) {
    const text = span.textContent.trim().toLowerCase();
    if (text.includes("what's on your mind") && span.offsetParent !== null) {
      const rect = span.getBoundingClientRect();
      return {
        success: true,
        __clickCoords: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) },
        __followUp: `(async function() {
          await new Promise(r => setTimeout(r, 1500));
          const dialog = document.querySelector('[role="dialog"]');
          if (dialog && dialog.offsetParent !== null) return { success: true };
          return { success: false, error: 'Composer dialog did not open', category: 'timeout' };
        })`,
      };
    }
  }

  return { success: false, error: 'Composer trigger not found', category: 'selector_not_found' };
}

/**
 * Set text in the open post composer dialog.
 * Requires the composer dialog to already be open (call open_composer first).
 * Note: Facebook renders the textbox outside the [role="dialog"] via DOM portals.
 * The textbox only appears after the text area is clicked/focused.
 * @param {Object} params
 * @param {string} params.text - The post text content.
 * @returns {Object} Result with readback verification.
 */
export async function set_post_text({ text }) {
  // Verify a dialog is open (composer must be active)
  const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(d => d.offsetParent !== null);
  if (dialogs.length === 0) {
    return { success: false, error: 'No dialog is open — call open_composer first', category: 'state_error' };
  }

  // Facebook renders the textbox OUTSIDE the dialog via portals.
  // Search globally for the contenteditable textbox with the composer placeholder.
  let textbox = document.querySelector('[role="textbox"][contenteditable="true"]');
  if (!textbox) {
    // The textbox may not exist until the text area is clicked.
    // Look for the placeholder area inside the dialog and return click coords.
    const placeholder = document.querySelector('[aria-placeholder*="on your mind"]');
    if (placeholder) {
      placeholder.click();
      await sleep(500);
      textbox = document.querySelector('[role="textbox"][contenteditable="true"]');
    }
  }
  if (!textbox) {
    return { success: false, error: 'Post textbox not found — click the text area first', category: 'selector_not_found' };
  }

  setContentEditableValue(textbox, text);
  await sleep(500);
  const readback = textbox.textContent.trim();
  if (!readback.includes(text.substring(0, 20))) {
    return { success: false, error: `Readback mismatch: expected text starting with "${text.substring(0, 20)}", got "${readback.substring(0, 40)}"`, category: 'state_error' };
  }
  return { success: true, text: readback };
}

/**
 * Close the topmost open dialog (Escape key).
 * Works for notifications panel, messenger, composer, post actions, etc.
 * @returns {Object} Result with __keyPress for Escape.
 */
export async function close_dialog() {
  const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(d => d.offsetParent !== null);
  if (dialogs.length === 0) {
    return { success: true, state: 'no_dialog_open' };
  }
  const countBefore = dialogs.length;
  return {
    success: true,
    dialogsBefore: countBefore,
    __keyPress: 'Escape',
    __followUp: `(function() {
      const remaining = [...document.querySelectorAll('[role="dialog"]')].filter(d => d.offsetParent !== null).length;
      return { success: true, dialogsBefore: ${countBefore}, dialogsAfter: remaining };
    })`,
  };
}

/**
 * Navigate to a section using the left sidebar or top navigation.
 * @param {Object} params
 * @param {string} params.section - Section name (e.g., "Friends", "Marketplace", "Groups", "Saved", "Memories", "Reels", "Feeds").
 * @returns {Object} Navigation result.
 */
export async function navigate_to({ section }) {
  // First try left sidebar links (by aria-label or text)
  const sidebarLink = querySelector([
    `[aria-label="${CSS.escape(section)}"]`,
  ]);
  if (sidebarLink) {
    // Return click coords for navigation links (they may need trusted clicks)
    const rect = sidebarLink.getBoundingClientRect();
    return {
      success: true,
      section,
      __clickCoords: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) },
    };
  }

  // Try finding by link text in the sidebar
  const links = document.querySelectorAll('a[role="link"]');
  for (const link of links) {
    if (link.textContent.trim() === section && link.offsetParent !== null) {
      const rect = link.getBoundingClientRect();
      return {
        success: true,
        section,
        __clickCoords: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) },
      };
    }
  }

  // Try top navigation tabs
  const topLinks = document.querySelectorAll('[role="navigation"] a[role="link"]');
  for (const link of topLinks) {
    if (link.getAttribute('aria-label') === section || link.textContent.trim() === section) {
      const rect = link.getBoundingClientRect();
      return {
        success: true,
        section,
        __clickCoords: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) },
      };
    }
  }

  return { success: false, error: `Section "${section}" not found in sidebar or navigation`, category: 'selector_not_found' };
}

/**
 * Get visible feed posts with their content and metadata.
 * @param {Object} params
 * @param {number} [params.count=5] - Maximum number of posts to retrieve.
 * @returns {Object} Array of post data objects.
 */
export async function get_feed_posts({ count = 5 } = {}) {
  const posts = getFeedPosts(count);
  if (posts.length === 0) {
    return { success: false, error: 'No posts found in feed', category: 'selector_not_found',
      hint: 'The feed may not have loaded yet or the page is not on the homepage' };
  }
  const results = posts.map((post, i) => ({
    index: i,
    ...extractPostData(post),
  }));
  return { success: true, count: results.length, posts: results };
}

/**
 * Like a post in the feed (clicks the Like button).
 * @param {Object} params
 * @param {number} [params.postIndex=0] - 0-based index of the post to like.
 * @returns {Object} Click coords for trusted click on Like button.
 */
export async function like_post({ postIndex = 0 } = {}) {
  const post = getPostByIndex(postIndex);
  if (!post) {
    return { success: false, error: `Post at index ${postIndex} not found`, category: 'selector_not_found' };
  }
  const likeBtn = post.querySelector('[aria-label="Like"]') || post.querySelector('[aria-label="Like this post"]');
  if (!likeBtn) {
    return { success: false, error: 'Like button not found on post', category: 'selector_not_found' };
  }
  const rect = likeBtn.getBoundingClientRect();
  return {
    success: true,
    postIndex,
    __clickCoords: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) },
  };
}

/**
 * React to a post with a specific reaction (Like, Love, Care, Haha, Wow, Sad, Angry).
 * Hovers over the Like button to reveal the reaction bar, then clicks the desired reaction.
 * @param {Object} params
 * @param {string} params.reaction - Reaction name: "Like", "Love", "Care", "Haha", "Wow", "Sad", "Angry".
 * @param {number} [params.postIndex=0] - 0-based index of the post.
 * @returns {Object} Hover coords + follow-up click on the reaction button.
 */
export async function react_to_post({ reaction, postIndex = 0 }) {
  const validReactions = ['Like', 'Love', 'Care', 'Haha', 'Wow', 'Sad', 'Angry'];
  if (!validReactions.includes(reaction)) {
    return { success: false, error: `Invalid reaction "${reaction}". Valid: ${validReactions.join(', ')}`, category: 'state_error' };
  }

  const post = getPostByIndex(postIndex);
  if (!post) {
    return { success: false, error: `Post at index ${postIndex} not found`, category: 'selector_not_found' };
  }

  const likeBtn = post.querySelector('[aria-label="Like"]') || post.querySelector('[aria-label="Like this post"]');
  if (!likeBtn) {
    return { success: false, error: 'Like button not found on post', category: 'selector_not_found' };
  }

  // Return hover coords — exec() will move the mouse there and wait for the reaction bar
  const rect = likeBtn.getBoundingClientRect();
  return {
    success: true,
    reaction,
    postIndex,
    __hoverCoords: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) },
    __hoverDelay: 2000,
    __followUp: `(async function() {
      // Wait for reaction bar to appear
      await new Promise(r => setTimeout(r, 500));
      const reactionDialog = document.querySelector('[role="dialog"][aria-label="Reactions"]');
      if (!reactionDialog) {
        return { success: false, error: 'Reaction bar did not appear', category: 'timeout' };
      }
      const reactionBtn = reactionDialog.querySelector('[aria-label="${reaction}"]');
      if (!reactionBtn) {
        return { success: false, error: 'Reaction "${reaction}" button not found in bar', category: 'selector_not_found' };
      }
      reactionBtn.click();
      return { success: true, reaction: "${reaction}" };
    })`,
  };
}

/**
 * Click on a post's comment input to start writing a comment.
 * @param {Object} params
 * @param {number} [params.postIndex=0] - 0-based index of the post.
 * @returns {Object} Click coords for the comment input.
 */
export async function comment_on_post({ postIndex = 0 } = {}) {
  const post = getPostByIndex(postIndex);
  if (!post) {
    return { success: false, error: `Post at index ${postIndex} not found`, category: 'selector_not_found' };
  }

  // Look for the comment button or "Leave a comment" input
  const commentBtn = post.querySelector('[aria-label="Leave a comment"]') ||
                     post.querySelector('[aria-label="Write a comment"]') ||
                     post.querySelector('[aria-label="Comment"]');
  if (!commentBtn) {
    return { success: false, error: 'Comment button/input not found on post', category: 'selector_not_found' };
  }

  const rect = commentBtn.getBoundingClientRect();
  return {
    success: true,
    postIndex,
    __clickCoords: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) },
  };
}

/**
 * Open the actions menu (three-dot menu) for a post.
 * @param {Object} params
 * @param {number} [params.postIndex=0] - 0-based index of the post.
 * @returns {Object} Click coords for the actions button.
 */
export async function open_post_actions({ postIndex = 0 } = {}) {
  const post = getPostByIndex(postIndex);
  if (!post) {
    return { success: false, error: `Post at index ${postIndex} not found`, category: 'selector_not_found' };
  }

  const actionsBtn = post.querySelector('[aria-label="Actions for this post"]');
  if (!actionsBtn) {
    return { success: false, error: 'Actions button not found on post', category: 'selector_not_found' };
  }

  const rect = actionsBtn.getBoundingClientRect();
  return {
    success: true,
    postIndex,
    __clickCoords: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) },
    __followUp: `(async function() {
      await new Promise(r => setTimeout(r, 1000));
      const menus = document.querySelectorAll('[role="menu"]');
      for (const menu of menus) {
        if (menu.offsetHeight > 0 && menu.textContent.includes('Interested')) {
          const items = [...menu.querySelectorAll('[role="menuitem"], [role="button"]')]
            .filter(m => m.offsetHeight > 0)
            .map(m => m.textContent.trim().split('\\n')[0]);
          return { success: true, menuItems: items };
        }
      }
      return { success: false, error: 'Post actions menu did not appear', category: 'timeout' };
    })`,
  };
}

/**
 * Save a post (opens post actions menu, then clicks "Save post").
 * @param {Object} params
 * @param {number} [params.postIndex=0] - 0-based index of the post.
 * @returns {Object} Multi-step result.
 */
export async function save_post({ postIndex = 0 } = {}) {
  const post = getPostByIndex(postIndex);
  if (!post) {
    return { success: false, error: `Post at index ${postIndex} not found`, category: 'selector_not_found' };
  }

  const actionsBtn = post.querySelector('[aria-label="Actions for this post"]');
  if (!actionsBtn) {
    return { success: false, error: 'Actions button not found', category: 'selector_not_found' };
  }

  // Return click coords for the actions button with a follow-up to click "Save post"
  const rect = actionsBtn.getBoundingClientRect();
  return {
    success: true,
    postIndex,
    __clickCoords: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) },
    __followUp: `(async function() {
      await new Promise(r => setTimeout(r, 1000));
      const menus = document.querySelectorAll('[role="menu"]');
      for (const menu of menus) {
        if (menu.offsetHeight > 0) {
          const items = menu.querySelectorAll('[role="menuitem"], [role="button"]');
          for (const item of items) {
            if (item.textContent.trim().toLowerCase().includes('save') && item.offsetHeight > 0) {
              item.click();
              return { success: true, action: 'saved' };
            }
          }
        }
      }
      return { success: false, error: '"Save post" menu item not found', category: 'selector_not_found' };
    })`,
  };
}

/**
 * Hide a post from the feed (opens post actions menu, then clicks "Hide post").
 * @param {Object} params
 * @param {number} [params.postIndex=0] - 0-based index of the post.
 * @returns {Object} Multi-step result.
 */
export async function hide_post({ postIndex = 0 } = {}) {
  const post = getPostByIndex(postIndex);
  if (!post) {
    return { success: false, error: `Post at index ${postIndex} not found`, category: 'selector_not_found' };
  }

  const actionsBtn = post.querySelector('[aria-label="Actions for this post"]');
  if (!actionsBtn) {
    return { success: false, error: 'Actions button not found', category: 'selector_not_found' };
  }

  const rect = actionsBtn.getBoundingClientRect();
  return {
    success: true,
    postIndex,
    __clickCoords: { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) },
    __followUp: `(async function() {
      await new Promise(r => setTimeout(r, 1000));
      const menus = document.querySelectorAll('[role="menu"]');
      for (const menu of menus) {
        if (menu.offsetHeight > 0) {
          const items = menu.querySelectorAll('[role="menuitem"], [role="button"]');
          for (const item of items) {
            if (item.textContent.trim().toLowerCase().includes('hide') && item.offsetHeight > 0) {
              item.click();
              return { success: true, action: 'hidden' };
            }
          }
        }
      }
      return { success: false, error: '"Hide post" menu item not found', category: 'selector_not_found' };
    })`,
  };
}

/**
 * Scroll the news feed up or down.
 * @param {Object} params
 * @param {string} [params.direction="down"] - "up" or "down".
 * @param {number} [params.amount=800] - Scroll distance in pixels.
 * @returns {Object} Scroll position before and after.
 */
export async function scroll_feed({ direction = "down", amount = 800 } = {}) {
  const scrollBefore = window.scrollY;
  const delta = direction === "up" ? -amount : amount;
  window.scrollBy({ top: delta, behavior: 'smooth' });
  await sleep(500);
  const scrollAfter = window.scrollY;
  return {
    success: true,
    direction,
    amount,
    scrollBefore,
    scrollAfter,
    scrolled: Math.abs(scrollAfter - scrollBefore),
  };
}

/**
 * Open the notifications panel and retrieve notification items.
 * @returns {Object} Array of notification text snippets.
 */
export async function get_notifications() {
  const btn = querySelector([
    '[aria-label="Notifications"]',
  ]);
  if (!btn) {
    return { success: false, error: 'Notifications button not found', category: 'selector_not_found' };
  }
  btn.click();
  await sleep(1500);

  const dialog = querySelector(['[role="dialog"][aria-label="Notifications"]']);
  if (!dialog) {
    // Try any visible dialog
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(d => d.offsetParent !== null);
    if (dialogs.length === 0) {
      return { success: false, error: 'Notifications panel did not open', category: 'timeout' };
    }
  }

  // Extract notification text from links within the panel
  const panel = dialog || [...document.querySelectorAll('[role="dialog"]')].filter(d => d.offsetParent !== null).pop();
  const links = panel.querySelectorAll('a[role="link"]');
  const notifications = [];
  for (const link of links) {
    const text = link.textContent.trim();
    if (text && text.length > 5 && text.length < 500) {
      notifications.push(text.substring(0, 200));
    }
    if (notifications.length >= 10) break;
  }

  return { success: true, count: notifications.length, notifications };
}
