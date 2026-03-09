// =============================================================================
// Auto-generated Command Library for: google-forms
// Target: https://docs.google.com/forms/
// Generated: 2026-03-09
// Framework: AutoWebMCP v0.1.0
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
 * Try multiple CSS selectors, return all matches from the first selector that hits.
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
 * Set a value on an input element using keyboard simulation.
 * Google Forms (and similar apps) ignore direct .value assignment —
 * they only recognize user-initiated text input. We use execCommand('insertText')
 * which fires the correct internal events.
 */
export function setInputValue(el, value) {
  el.focus();
  // Select all existing text
  el.select();
  // Use execCommand to simulate typing — recognized by Google Forms framework
  document.execCommand('insertText', false, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Pause execution for a given number of milliseconds.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Click an element by its aria-label attribute (sanitized with CSS.escape).
 */
export function clickByAriaLabel(label) {
  const el = document.querySelector(`[aria-label="${CSS.escape(label)}"]`);
  if (!el) return false;
  el.click();
  return true;
}

/**
 * Find a button element by its visible text content.
 */
export function findButtonByText(text) {
  const buttons = document.querySelectorAll("button");
  for (const btn of buttons) {
    if (btn.textContent.trim() === text) return btn;
  }
  return null;
}

/**
 * Like querySelector, but only returns the first *visible* match (offsetParent !== null).
 * Essential for Google Forms where every question card has its own copy of buttons/toggles
 * but only the active card's controls are visible.
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
 * Click a menu item by partial text match (case-insensitive).
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

// --- App-Specific Helpers (ALL MUST BE EXPORTED) ---

/**
 * Get the currently focused/active question card element.
 */
export function getActiveQuestionCard() {
  // The focused question card has a blue left border and expanded controls
  // Look for the card that contains visible editing controls
  const cards = document.querySelectorAll('[data-item-id]');
  for (const card of cards) {
    // Active card has the question textbox visible
    const textbox = card.querySelector('[aria-label="Question"]');
    if (textbox && textbox.offsetParent !== null) return card;
  }
  // Fallback: find card with visible duplicate/delete buttons
  const allCards = document.querySelectorAll('.freebirdFormeditorViewItemRoot');
  for (const card of allCards) {
    const deleteBtn = card.querySelector('[aria-label="Delete question"]');
    if (deleteBtn && deleteBtn.offsetParent !== null) return card;
  }
  return null;
}

/**
 * Click a question card to focus/activate it.
 */
export function focusQuestionByIndex(index) {
  const cards = document.querySelectorAll('[data-item-id]');
  if (index < 0 || index >= cards.length) return false;
  cards[index].click();
  return true;
}

/**
 * Check if we're on the forms homepage (list view) vs the editor.
 */
export function isHomepage() {
  return /\/forms\/u\/\d+\/?$/.test(window.location.pathname) ||
         window.location.pathname === '/forms/' ||
         window.location.pathname.endsWith('/forms');
}

/**
 * Check if we're in the form editor.
 */
export function isEditor() {
  return /\/forms\/d\/[^/]+\/edit/.test(window.location.href);
}

/**
 * Select an option from a Google Forms listbox by visible text.
 */
export function selectListboxOption(listboxSelector, optionText) {
  const listbox = document.querySelector(listboxSelector);
  if (!listbox) return false;
  // Click the listbox to open it
  listbox.click();
  // Find and click the matching option
  const options = listbox.querySelectorAll('[role="option"]');
  for (const opt of options) {
    if (opt.textContent.trim().toLowerCase() === optionText.toLowerCase()) {
      opt.click();
      return true;
    }
  }
  return false;
}

// =============================================================================
// LEARNED OPERATIONS
// =============================================================================

/**
 * Get current form info: title, description, URL, and publish status.
 */
export async function get_form_info() {
  if (isHomepage()) {
    return { success: false, error: "On forms homepage, not in a form editor", category: "state_error", hint: "Open a form first" };
  }
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const titleEl = querySelector(['[aria-label="Form title"]', '[data-placeholder="Form title"]']);
  const descEl = querySelector(['[aria-label="Form description"]', '[data-placeholder="Form description"]']);
  const docTitleEl = querySelector(['input[aria-label="Document title"]', 'input[type="text"][aria-label="Document title"]']);

  const title = titleEl ? titleEl.textContent.trim() : "";
  const description = descEl ? descEl.textContent.trim() : "";
  const documentTitle = docTitleEl ? docTitleEl.value : "";

  // Count questions
  const questionCards = document.querySelectorAll('[data-item-id]');

  // Check save status
  const saveStatus = document.querySelector('.docs-title-save-label-text');
  const saveText = saveStatus ? saveStatus.textContent.trim() : "";

  return {
    success: true,
    formTitle: title,
    formDescription: description,
    documentTitle: documentTitle,
    questionCount: questionCards.length,
    url: window.location.href,
    saveStatus: saveText || "saved"
  };
}

/**
 * List recent forms from the homepage.
 */
export async function list_forms() {
  if (!isHomepage()) {
    return { success: false, error: "Not on the forms homepage", category: "state_error", hint: "Navigate to https://docs.google.com/forms/u/0/" };
  }

  // Recent forms are .docs-homescreen-grid-item inside .docs-homescreen-item-section
  // (NOT the template gallery which is a separate [role="listbox"])
  const formItems = document.querySelectorAll('.docs-homescreen-item-section .docs-homescreen-grid-item');
  const forms = [];
  for (const item of formItems) {
    const titleEl = item.querySelector('.docs-homescreen-grid-item-title');
    const timeEl = item.querySelector('.docs-homescreen-grid-item-time');
    if (titleEl) {
      forms.push({
        name: titleEl.textContent.trim(),
        date: timeEl ? timeEl.textContent.trim() : "",
      });
    }
  }

  return { success: true, forms, count: forms.length };
}

/**
 * Create a new blank form from the homepage.
 */
export async function create_form() {
  if (!isHomepage()) {
    return { success: false, error: "Not on the forms homepage", category: "state_error", hint: "Navigate to https://docs.google.com/forms/u/0/" };
  }

  // Click the "Blank form" option in the template gallery
  const blankOption = querySelector(['[role="option"]']);
  if (!blankOption) {
    return { success: false, error: "Blank form option not found", category: "selector_not_found" };
  }
  blankOption.click();

  return { success: true, message: "Creating new blank form — page will navigate to editor" };
}

/**
 * Create a form from a named template.
 */
export async function create_form_from_template({ template }) {
  if (!isHomepage()) {
    return { success: false, error: "Not on the forms homepage", category: "state_error" };
  }

  const options = document.querySelectorAll('[role="option"]');
  for (const opt of options) {
    const text = opt.textContent.trim().toLowerCase();
    if (text.includes(template.toLowerCase())) {
      opt.click();
      return { success: true, message: `Creating form from template: ${template}` };
    }
  }

  return { success: false, error: `Template "${template}" not found`, category: "selector_not_found",
    hint: "Available templates: Blank, Customer Feedback, Contact Information, RSVP, Party Invite, T-Shirt Sign Up, Event Registration, Event Feedback, Blank Quiz, etc." };
}

/**
 * Open an existing form by name from the homepage.
 */
export async function open_form({ name }) {
  if (!isHomepage()) {
    return { success: false, error: "Not on the forms homepage", category: "state_error" };
  }

  // Search recent forms (not templates) by title text
  const formItems = document.querySelectorAll('.docs-homescreen-item-section .docs-homescreen-grid-item');
  for (const item of formItems) {
    const titleEl = item.querySelector('.docs-homescreen-grid-item-title');
    if (titleEl && titleEl.textContent.trim().toLowerCase().includes(name.toLowerCase())) {
      item.click();
      return { success: true, message: `Opening form: ${titleEl.textContent.trim()}` };
    }
  }

  return { success: false, error: `Form "${name}" not found in recent forms`, category: "selector_not_found" };
}

/**
 * Set the form title text.
 */
export async function set_form_title({ title }) {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  // Click on the form header area to activate it
  const headerCard = querySelector(['.freebirdFormeditorViewHeaderHeader', '[data-placeholder="Form title"]', '[aria-label="Form title"]']);
  if (!headerCard) {
    return { success: false, error: "Form title element not found", category: "selector_not_found" };
  }
  headerCard.click();
  await sleep(300);

  // Find the title textbox
  const titleEl = querySelector(['[aria-label="Form title"]', '[data-placeholder="Form title"]']);
  if (!titleEl) {
    return { success: false, error: "Form title textbox not found after click", category: "selector_not_found" };
  }

  // Clear and set new title
  titleEl.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, title);

  await sleep(300);

  // Readback verification
  const readback = titleEl.textContent.trim();
  if (readback !== title) {
    return { success: false, error: `Readback mismatch: expected "${title}", got "${readback}"`, category: "state_error" };
  }

  return { success: true, title: readback };
}

/**
 * Set the form description text.
 */
export async function set_form_description({ description }) {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  // Click on the form header area to activate it
  const headerCard = querySelector(['.freebirdFormeditorViewHeaderHeader', '[data-placeholder="Form title"]']);
  if (headerCard) headerCard.click();
  await sleep(300);

  const descEl = querySelector(['[aria-label="Form description"]', '[data-placeholder="Form description"]']);
  if (!descEl) {
    return { success: false, error: "Form description element not found", category: "selector_not_found" };
  }

  descEl.focus();
  await sleep(200);
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, description);

  await sleep(300);

  const readback = descEl.textContent.trim();
  if (readback !== description) {
    return { success: false, error: `Readback mismatch: expected "${description}", got "${readback}"`, category: "state_error" };
  }

  return { success: true, description: readback };
}

/**
 * Set the document title (shown in browser tab and Google Drive).
 */
export async function set_document_title({ title }) {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const docTitle = querySelector(['input[aria-label="Document title"]', 'input.docs-title-input']);
  if (!docTitle) {
    return { success: false, error: "Document title input not found", category: "selector_not_found" };
  }

  docTitle.focus();
  docTitle.select();
  setInputValue(docTitle, title);
  docTitle.dispatchEvent(new Event('change', { bubbles: true }));
  // Trigger blur to save
  docTitle.blur();
  await sleep(500);

  // Readback
  const readback = docTitle.value;
  if (readback !== title) {
    return { success: false, error: `Readback mismatch: expected "${title}", got "${readback}"`, category: "state_error" };
  }

  return { success: true, title: readback };
}

/**
 * Add a new question to the form.
 */
export async function add_question({ text, type }) {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  // Click "Add question" button in the floating sidebar
  const addBtn = querySelector(['[aria-label="Add question"]', '[data-tooltip="Add question"]']);
  if (!addBtn) {
    return { success: false, error: "Add question button not found", category: "selector_not_found" };
  }
  addBtn.click();
  await sleep(500);

  // Set question text if provided
  if (text) {
    const questionInput = querySelector(['[aria-label="Question"]']);
    if (questionInput) {
      questionInput.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
      await sleep(200);
    }
  }

  // Set question type if provided
  if (type) {
    const typeDropdown = querySelector(['[aria-label="Question types"]', '[role="listbox"][aria-label*="Question type"]']);
    if (typeDropdown) {
      typeDropdown.click();
      await sleep(300);
      // Scope to the VISIBLE "Question types" listbox
      const listboxes = document.querySelectorAll('[role="listbox"][aria-label="Question types"]');
      let activeListbox = null;
      for (const lb of listboxes) {
        if (lb.offsetParent !== null) { activeListbox = lb; break; }
      }
      const options = activeListbox
        ? activeListbox.querySelectorAll('[role="option"]')
        : document.querySelectorAll('[role="option"]');
      for (const opt of options) {
        if (opt.textContent.trim().toLowerCase() === type.toLowerCase()) {
          opt.click();
          await sleep(300);
          break;
        }
      }
    }
  }

  return { success: true, message: `Question added${text ? `: "${text}"` : ""}${type ? ` (${type})` : ""}` };
}

/**
 * Set the text of the currently focused question.
 */
export async function set_question_text({ text }) {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const questionInput = queryVisibleSelector(['[aria-label="Question"]']);
  if (!questionInput) {
    return { success: false, error: "No question is currently focused/active", category: "state_error", hint: "Click on a question first to activate it" };
  }

  questionInput.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, text);
  await sleep(200);

  return { success: true, text };
}

/**
 * Change the type of the currently focused question.
 */
export async function set_question_type({ type }) {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const validTypes = [
    "short answer", "paragraph", "multiple choice", "checkboxes", "dropdown",
    "file upload", "linear scale", "rating", "multiple choice grid", "checkbox grid",
    "date", "time"
  ];
  const normalizedType = type.toLowerCase();
  if (!validTypes.includes(normalizedType)) {
    return { success: false, error: `Invalid question type: "${type}"`, category: "state_error",
      hint: `Valid types: ${validTypes.join(", ")}` };
  }

  // Click the question type dropdown (use visible selector — one per question card)
  const typeDropdown = queryVisibleSelector(['[aria-label="Question types"]', '[role="listbox"][aria-label*="Question type"]']);
  if (!typeDropdown) {
    return { success: false, error: "Question type dropdown not found — is a question focused?", category: "state_error" };
  }

  typeDropdown.click();
  await sleep(400);

  // Find the VISIBLE "Question types" listbox (there is one per question card)
  const listboxes = document.querySelectorAll('[role="listbox"][aria-label="Question types"]');
  let activeListbox = null;
  for (const lb of listboxes) {
    if (lb.offsetParent !== null) { activeListbox = lb; break; }
  }
  const options = activeListbox
    ? activeListbox.querySelectorAll('[role="option"]')
    : document.querySelectorAll('[role="listbox"] [role="option"]');
  for (const opt of options) {
    if (opt.textContent.trim().toLowerCase() === normalizedType) {
      opt.click();
      await sleep(300);
      return { success: true, type: opt.textContent.trim() };
    }
  }

  return { success: false, error: `Could not find option "${type}" in dropdown`, category: "selector_not_found" };
}

/**
 * Add an option to the currently focused multiple-choice/checkbox/dropdown question.
 */
export async function add_option({ text }) {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const card = getActiveQuestionCard();
  if (!card) {
    return { success: false, error: "No active question card — click a question first", category: "state_error" };
  }

  // Find the "Add option" input within the active card
  const addOptionInput = card.querySelector('input[aria-label="Add option"]') ||
                         card.querySelector('input[placeholder="Add option"]');
  if (!addOptionInput) {
    return { success: false, error: "Add option input not found — is a multiple-choice question focused?", category: "state_error" };
  }

  // Count options before to find the new one after
  const beforeCount = card.querySelectorAll('input[aria-label="option value"]').length;

  addOptionInput.focus();
  addOptionInput.click();
  await sleep(400);

  // Find the newly created option (scoped to active card)
  const optionInputs = card.querySelectorAll('input[aria-label="option value"]');
  const lastInput = optionInputs[optionInputs.length - 1];
  if (lastInput) {
    setInputValue(lastInput, text);
    lastInput.dispatchEvent(new Event('blur', { bubbles: true }));
    await sleep(300);
  }

  // Verify the text was set
  const afterValue = lastInput ? lastInput.value : null;
  return { success: afterValue === text, option: text, verified: afterValue };
}

/**
 * Toggle the Required switch on the currently focused question.
 */
export async function toggle_required() {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const toggle = queryVisibleSelector(['[aria-label="Required"]', '[data-is-required]']);
  if (!toggle) {
    return { success: false, error: "Required toggle not found — is a question focused?", category: "state_error" };
  }

  toggle.click();
  await sleep(300);

  const isChecked = toggle.getAttribute('aria-checked') === 'true' || toggle.checked;
  return { success: true, required: isChecked };
}

/**
 * Duplicate the currently focused question.
 */
export async function duplicate_question() {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const btn = queryVisibleSelector(['[aria-label="Duplicate question"]']);
  if (!btn) {
    return { success: false, error: "Duplicate button not found — is a question focused?", category: "state_error" };
  }

  btn.click();
  await sleep(500);

  return { success: true, message: "Question duplicated" };
}

/**
 * Delete the currently focused question.
 */
export async function delete_question() {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const btn = queryVisibleSelector(['[aria-label="Delete question"]']);
  if (!btn) {
    return { success: false, error: "Delete button not found — is a question focused?", category: "state_error" };
  }

  btn.click();
  await sleep(500);

  return { success: true, message: "Question deleted" };
}

/**
 * Add a new section divider to the form.
 */
export async function add_section() {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const btn = querySelector(['[aria-label="Add section"]', '[data-tooltip="Add section"]']);
  if (!btn) {
    return { success: false, error: "Add section button not found", category: "selector_not_found" };
  }

  btn.click();
  await sleep(500);

  return { success: true, message: "Section added" };
}

/**
 * Add a title and description block to the form.
 */
export async function add_title_description() {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const btn = querySelector(['[aria-label="Add title and description"]', '[data-tooltip="Add title and description"]']);
  if (!btn) {
    return { success: false, error: "Add title and description button not found", category: "selector_not_found" };
  }

  btn.click();
  await sleep(500);

  return { success: true, message: "Title and description block added" };
}

/**
 * Set the form's accent color from the theme panel.
 */
export async function set_theme_color({ color }) {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  // Open theme panel
  const themeBtn = querySelector(['[aria-label="Customize Theme"]', '[data-tooltip="Customize Theme"]']);
  if (!themeBtn) {
    return { success: false, error: "Customize Theme button not found", category: "selector_not_found" };
  }
  themeBtn.click();
  await sleep(500);

  // Color swatches are [role="listitem"] with aria-labels like "Red #db4437",
  // "Current color Teal #009688". Match by partial color name.
  // Accent swatches come before background swatches — match the first visible hit.
  const allItems = document.querySelectorAll('[role="listitem"]');
  for (const s of allItems) {
    const label = (s.getAttribute('aria-label') || '');
    if (label.includes('#') && label.toLowerCase().includes(color.toLowerCase()) && s.offsetParent !== null) {
      s.click();
      await sleep(300);
      const closeBtn = querySelector(['[aria-label="Close"]']) || findButtonByText("Close");
      if (closeBtn) closeBtn.click();
      return { success: true, color };
    }
  }

  // Close theme panel on failure
  const closeBtn = querySelector(['[aria-label="Close"]']) || findButtonByText("Close");
  if (closeBtn) closeBtn.click();

  return { success: false, error: `Color "${color}" not found`,
    category: "selector_not_found",
    hint: "Available colors: Red, Purple, Indigo, Blue, Light Blue, Cyan, Red Orange, Orange, Teal, Green, Blue Gray" };
}

/**
 * Set the form's background color from the theme panel.
 */
export async function set_background_color({ color }) {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const themeBtn = querySelector(['[aria-label="Customize Theme"]', '[data-tooltip="Customize Theme"]']);
  if (!themeBtn) {
    return { success: false, error: "Customize Theme button not found", category: "selector_not_found" };
  }
  themeBtn.click();
  await sleep(500);

  // Background swatches are listitems with labels like "Light #d9efed", "Medium #bfe5e1",
  // "Dark #a6dad5", "Gray #f6f6f6". These names (Light/Medium/Dark/Gray) are unique to
  // background swatches and don't appear in accent color labels.
  const bgMap = { "light": "Light", "medium": "Medium", "dark": "Dark", "gray": "Gray" };
  const searchTerm = bgMap[color.toLowerCase()] || color;
  const allItems = document.querySelectorAll('[role="listitem"]');
  for (const s of allItems) {
    const label = (s.getAttribute('aria-label') || '');
    if (label.includes('#') && label.includes(searchTerm) && s.offsetParent !== null) {
      s.click();
      await sleep(300);
      const closeBtn = querySelector(['[aria-label="Close"]']) || findButtonByText("Close");
      if (closeBtn) closeBtn.click();
      return { success: true, color };
    }
  }

  const closeBtn = querySelector(['[aria-label="Close"]']) || findButtonByText("Close");
  if (closeBtn) closeBtn.click();

  return { success: false, error: `Background color "${color}" not found`,
    category: "selector_not_found",
    hint: "Available backgrounds: light, medium, dark, gray" };
}

/**
 * Toggle "Make this a quiz" in settings.
 */
export async function toggle_quiz_mode() {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  // Navigate to Settings tab
  const settingsTab = querySelector(['[role="tab"]:last-child', '[role="tab"]']);
  const tabs = document.querySelectorAll('[role="tab"]');
  let settingsClicked = false;
  for (const tab of tabs) {
    if (tab.textContent.trim().toLowerCase().includes('settings')) {
      tab.click();
      settingsClicked = true;
      break;
    }
  }
  if (!settingsClicked) {
    return { success: false, error: "Settings tab not found", category: "selector_not_found" };
  }
  await sleep(500);

  // Find and toggle the quiz checkbox
  const quizToggle = querySelector(['[aria-label*="Make this a quiz"]', '[aria-label*="quiz"]']);
  if (!quizToggle) {
    return { success: false, error: "Quiz toggle not found", category: "selector_not_found" };
  }

  quizToggle.click();
  await sleep(500);

  const isChecked = quizToggle.getAttribute('aria-checked') === 'true' || quizToggle.checked;
  return { success: true, quizMode: isChecked };
}

/**
 * Set email collection mode in settings.
 */
export async function set_collect_emails({ mode }) {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const validModes = ["do not collect", "verified", "responder input"];
  if (!validModes.includes(mode.toLowerCase())) {
    return { success: false, error: `Invalid mode: "${mode}"`, hint: `Valid modes: ${validModes.join(", ")}` };
  }

  // Navigate to Settings tab
  const tabs = document.querySelectorAll('[role="tab"]');
  for (const tab of tabs) {
    if (tab.textContent.trim().toLowerCase().includes('settings')) {
      tab.click();
      break;
    }
  }
  await sleep(500);

  // Expand Responses section if collapsed
  const responsesBtn = querySelector(['[aria-label="View responses settings"]']);
  if (responsesBtn) {
    responsesBtn.click();
    await sleep(300);
  }

  // Find the "Collect email addresses" dropdown
  const emailDropdown = querySelector(['[aria-label*="collect responder emails"]', '[aria-label*="Collect email"]']);
  if (!emailDropdown) {
    return { success: false, error: "Email collection dropdown not found", category: "selector_not_found" };
  }

  emailDropdown.click();
  await sleep(300);

  const options = document.querySelectorAll('[role="option"]');
  for (const opt of options) {
    if (opt.textContent.trim().toLowerCase() === mode.toLowerCase()) {
      opt.click();
      await sleep(300);
      return { success: true, mode: opt.textContent.trim() };
    }
  }

  return { success: false, error: `Could not find mode "${mode}" in dropdown`, category: "selector_not_found" };
}

/**
 * Toggle "Limit to 1 response" in settings.
 */
export async function toggle_limit_responses() {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const tabs = document.querySelectorAll('[role="tab"]');
  for (const tab of tabs) {
    if (tab.textContent.trim().toLowerCase().includes('settings')) {
      tab.click();
      break;
    }
  }
  await sleep(500);

  // Expand Responses section if collapsed
  const responsesBtn = querySelector(['[aria-label="View responses settings"]']);
  if (responsesBtn) {
    responsesBtn.click();
    await sleep(300);
  }

  const toggle = querySelector(['[aria-label*="Limit to 1 response"]']);
  if (!toggle) {
    return { success: false, error: "Limit to 1 response toggle not found", category: "selector_not_found" };
  }

  toggle.click();
  await sleep(300);

  const isChecked = toggle.getAttribute('aria-checked') === 'true' || toggle.checked;
  return { success: true, limitToOne: isChecked };
}

/**
 * Set the post-submission confirmation message.
 */
export async function set_confirmation_message({ message }) {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const tabs = document.querySelectorAll('[role="tab"]');
  for (const tab of tabs) {
    if (tab.textContent.trim().toLowerCase().includes('settings')) {
      tab.click();
      break;
    }
  }
  await sleep(500);

  // Expand Presentation section
  const presentationBtn = querySelector(['[aria-label="View presentation settings"]']);
  if (presentationBtn) {
    presentationBtn.click();
    await sleep(300);
  }

  // Click "Edit" button on confirmation message
  const editBtn = querySelector(['[aria-label="Edit confirmation message"]']);
  if (editBtn) {
    editBtn.click();
    await sleep(300);
  }

  const messageInput = querySelector(['[aria-label="Confirmation message"]', 'textarea[aria-label="Confirmation message"]']);
  if (!messageInput) {
    return { success: false, error: "Confirmation message input not found", category: "selector_not_found" };
  }

  messageInput.focus();
  if (messageInput.tagName === 'TEXTAREA' || messageInput.tagName === 'INPUT') {
    messageInput.select();
    setInputValue(messageInput, message);
  } else {
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, message);
  }
  await sleep(300);

  // Click Save button
  const saveBtn = findButtonByText("Save");
  if (saveBtn) {
    saveBtn.click();
    await sleep(300);
  }

  return { success: true, message };
}

/**
 * Get the number of form responses.
 */
export async function get_response_count() {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  // Switch to Responses tab
  const tabs = document.querySelectorAll('[role="tab"]');
  for (const tab of tabs) {
    if (tab.textContent.trim().toLowerCase().includes('responses')) {
      tab.click();
      break;
    }
  }
  await sleep(500);

  // Read the response count heading
  const countEl = querySelector(['[class*="responseCount"]', 'h2', 'div']);
  const allText = document.body.innerText;
  const match = allText.match(/(\d+)\s*responses?/i);

  return { success: true, count: match ? parseInt(match[1]) : 0 };
}

/**
 * Open the form preview in a new tab.
 */
export async function preview_form() {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const previewLink = querySelector(['[aria-label="Preview"]', '[data-tooltip="Preview"]']);
  if (!previewLink) {
    return { success: false, error: "Preview button not found", category: "selector_not_found" };
  }

  previewLink.click();
  return { success: true, message: "Preview opened in new tab" };
}

/**
 * Undo the last editing action.
 */
export async function undo() {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const btn = querySelector(['[aria-label="Undo"]', '[data-tooltip="Undo"]']);
  if (!btn) {
    return { success: false, error: "Undo button not found", category: "selector_not_found" };
  }

  btn.click();
  await sleep(300);
  return { success: true, message: "Undo performed" };
}

/**
 * Redo the last undone action.
 */
export async function redo() {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const btn = querySelector(['[aria-label="Redo"]', '[data-tooltip="Redo"]']);
  if (!btn) {
    return { success: false, error: "Redo button not found", category: "selector_not_found" };
  }

  btn.click();
  await sleep(300);
  return { success: true, message: "Redo performed" };
}

/**
 * Switch between Questions, Responses, and Settings tabs.
 */
export async function navigate_tab({ tab }) {
  if (!isEditor()) {
    return { success: false, error: "Not in form editor", category: "state_error" };
  }

  const validTabs = ["questions", "responses", "settings"];
  if (!validTabs.includes(tab.toLowerCase())) {
    return { success: false, error: `Invalid tab: "${tab}"`, hint: `Valid tabs: ${validTabs.join(", ")}` };
  }

  const tabs = document.querySelectorAll('[role="tab"]');
  for (const t of tabs) {
    if (t.textContent.trim().toLowerCase().includes(tab.toLowerCase())) {
      t.click();
      await sleep(300);
      return { success: true, tab: t.textContent.trim() };
    }
  }

  return { success: false, error: `Tab "${tab}" not found`, category: "selector_not_found" };
}
