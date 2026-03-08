// =============================================================================
// Auto-generated Command Library for: {{APP_NAME}}
// Target: {{TARGET_URL}}
// Generated: {{TIMESTAMP}}
// Framework: AutoWebMCP v0.1.0
//
// This module contains all learned operations as functions.
// Each function is designed to be executed in the browser page context
// via puppeteer's page.evaluate().
// =============================================================================

// --- Utility Functions (injected into page context) ---

/**
 * Try multiple CSS selectors, return the first match.
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
 * Wait for an element matching any of the given selectors to appear.
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
 * Set a value on an input element, dispatching the right events
 * for React, Vue, and other frameworks.
 */
export function setInputValue(el, value) {
  // Try native setter for React compatibility
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

/**
 * Pause execution for a given number of milliseconds.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// LEARNED OPERATIONS
// =============================================================================
// {{OPERATIONS}}
//
// Each operation is an exported async function that:
//   1. Checks preconditions
//   2. Executes the learned procedure
//   3. Returns { success: boolean, ...result data }
//
// Example:
//
// export async function compose_message({ to, subject, body }) {
//   const btn = querySelector(['[data-action="compose"]', '[aria-label="Compose"]']);
//   if (!btn) return { success: false, error: 'Compose button not found' };
//   btn.click();
//   await waitForElement(['[role="dialog"]'], 3000);
//   // ... fill fields ...
//   return { success: true, message: 'Composed' };
// }
// =============================================================================
