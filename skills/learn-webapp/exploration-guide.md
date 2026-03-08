# Exploration Strategy Guide

Reference material for the learn-webapp skill. Detailed strategies for exploring
different types of web application elements.

## Element Exploration Strategies

### Buttons and Action Elements

1. Identify by: `button`, `[role="button"]`, `a.btn`, `[type="submit"]`
2. Before clicking: note surrounding context, form state, page URL
3. Click and observe: modal opened? navigation? toast message? state change?
4. If modal/dialog opens: catalog all elements INSIDE it before closing
5. Reset: close modal (Escape key), navigate back if needed

### Form Inputs

1. Identify by: `input`, `textarea`, `select`, `[contenteditable]`
2. Note the input type: text, email, number, date, password, checkbox, radio
3. For text inputs: type a test value like "test_value" and observe validation
4. For selects: open dropdown, read all options, select one
5. For checkboxes/radios: toggle and observe changes
6. For date pickers: click to open calendar widget, note the interface
7. Check for: inline validation, character counters, auto-complete

### Navigation Elements

1. Identify by: `nav`, `[role="navigation"]`, `a[href]`, `[role="tab"]`
2. Note the current URL and page state
3. Click/activate and observe: full page navigation? tab switch? accordion?
4. If SPA navigation: note URL change and content swap without full reload
5. Map the navigation structure: which links lead where

### Rich Text Editors

1. Identify by: `[contenteditable="true"]`, `[role="textbox"]`, iframe-based editors
2. Check toolbar buttons: bold, italic, lists, links, images
3. Test formatting: select text, apply format, verify DOM change
4. Test content insertion: type text, paste content
5. Note the underlying format: HTML, Markdown, proprietary

### Tables and Lists

1. Identify by: `table`, `[role="grid"]`, `[role="list"]`, repeated row patterns
2. Check for: sortable columns, pagination, selection, inline editing
3. Test row interactions: click row (selection? navigation?), hover (actions appear?)
4. Check column headers: clickable for sorting?
5. Look for: filters, search, bulk actions

### Menus and Dropdowns

1. Identify by: `[role="menu"]`, `[aria-haspopup]`, context menus
2. Trigger: click, right-click, or hover
3. Map all menu items and sub-menus
4. Note keyboard navigation support
5. Test menu item actions

## Common Patterns to Recognize

### CRUD Operations
- Create: "New", "Add", "Create", "+" buttons → forms/dialogs
- Read: List views, detail views, search/filter
- Update: "Edit", inline editing, update forms
- Delete: "Delete", "Remove", trash icons → confirmation dialogs

### Communication Workflows
- Compose: "New message", "Reply", "Forward" → compose UI
- Recipients: To/CC/BCC fields, contact pickers
- Content: Rich text body, attachments
- Send: Submit action with confirmation

### Status/Workflow Transitions
- Status indicators: badges, labels, progress bars
- Transition actions: "Approve", "Reject", "Archive", "Close"
- Confirmation: dialogs before state changes

## Selector Robustness Hierarchy

From most to least stable:

1. `[data-testid="compose-btn"]` — Test IDs (most stable, added for testing)
2. `#compose-button` — Unique IDs
3. `[aria-label="Compose new message"]` — Accessibility labels
4. `[role="button"][aria-label*="Compose"]` — Role + partial label
5. `button.compose-action` — Tag + class
6. `.sidebar > .actions > button:first-child` — Structural (least stable)

Always provide at least 2-3 selectors per element.

## Handling Async Updates

Many modern web apps update the DOM asynchronously. After any interaction:

```javascript
// Wait for element to appear
function waitForElement(selectors, timeout = 5000) {
  return new Promise((resolve, reject) => {
    // Check immediately
    for (const sel of (Array.isArray(selectors) ? selectors : [selectors])) {
      const el = document.querySelector(sel);
      if (el) return resolve(el);
    }
    // Observe for changes
    const observer = new MutationObserver(() => {
      for (const sel of (Array.isArray(selectors) ? selectors : [selectors])) {
        const el = document.querySelector(sel);
        if (el) { observer.disconnect(); resolve(el); }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); reject(new Error('Timeout')); }, timeout);
  });
}

// Wait for element to disappear
function waitForRemoval(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (!document.querySelector(selector)) return resolve();
    const observer = new MutationObserver(() => {
      if (!document.querySelector(selector)) { observer.disconnect(); resolve(); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); reject(new Error('Timeout')); }, timeout);
  });
}

// Set value on React/Vue managed inputs
function setInputValue(el, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set || Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
```
