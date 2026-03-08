# AutoWebMCP — High-Level Project Description and Intent

## Vision

AutoWebMCP is a framework for automatically deriving application-specific MCP (Model Context Protocol) servers from rich, interaction-heavy web applications. It replaces brittle low-level browser automation (click coordinates, DOM selectors, pixel-level assertions) with stable, semantic operations that mirror how users actually think about and work within a web application.

## Problem Statement

Current approaches to agent-driven web automation rely on fragile, low-level browser control: clicking elements by selector, typing into fields by XPath, and navigating by URL patterns. These approaches break when applications update their UI, produce unreliable results across environments, and fail to express meaningful user intent. The gap between what a user *means* ("compose a reply to the latest message") and what automation *does* ("click div.reply-btn, wait 200ms, focus textarea#body, type text") is where reliability collapses.

## Core Idea

For each target web application, AutoWebMCP:

1. **Explores** the application through controlled experimentation — modifying page elements, triggering actions, and observing visual and structural changes.
2. **Infers** a set of high-level semantic commands that represent meaningful user operations within that application (e.g., "send message", "edit field", "apply filter", "submit form").
3. **Learns** how to realize each command through executable in-page procedures and browser control mechanisms, mapping user intent to reliable execution paths.
4. **Compiles** the learned operations into an application-specific JavaScript command library exposed through a dedicated MCP server.
5. **Publishes** each MCP server to a shared repository, making it reusable across agents and sessions.

## Key Distinction: Learning vs. Runtime

The framework separates two phases:

- **Learning phase**: Claude Code skills explore the target application through experimentation. They modify DOM elements, observe resulting changes, perform user actions while capturing event traces and DOM mutations, and iteratively build a model of how high-level operations map to executable procedures. This phase is resource-intensive and runs offline.

- **Runtime phase**: A separate Claude skill detects when interaction with a supported web application is needed, checks the repository for a matching MCP server, and installs it as the tool layer. The agent then operates through high-level semantic commands without needing to understand the application's internal structure.

## What "Semantic Operations" Means

Commands exposed by a learned MCP server correspond to application-level actions, not browser-level primitives:

| Instead of...                              | The agent calls...                        |
|--------------------------------------------|-------------------------------------------|
| `click('#compose-btn')`                    | `compose_new_message()`                   |
| `querySelector('.to-field').value = '...'` | `set_recipient("user@example.com")`       |
| `click('.bold-btn')`                       | `format_selection("bold")`                |
| `click('.submit'), waitForNavigation()`    | `submit_form("contact")`                  |
| `scroll, find, click row 3 col 2`         | `edit_cell(row=3, col="Status", "Done")`  |

These semantic operations are stable across UI redesigns, self-descriptive, composable, and directly express user intent.

## Target Application Profile

AutoWebMCP is designed for web applications that are:

- **Form-heavy**: Applications with structured input fields, validation, and multi-step workflows (CRMs, admin panels, data-entry tools).
- **Messaging-centric**: Applications with compose flows, threading, recipients, and attachments (email clients, chat platforms, support desks).
- **Content-editing**: Applications with rich-text editors, structured content blocks, and formatting controls (CMSs, document editors, wiki platforms).
- **Interaction-rich**: Applications where user workflows involve multi-step sequences across stateful UI components.

## Project Intent

The central contribution of AutoWebMCP is the **induction of semantic, reusable action layers** for complex web applications. Success is measured by:

- **Coverage**: How many useful application commands the learned MCP server exposes.
- **Reliability**: How consistently the learned procedures execute correctly across sessions and minor UI changes.
- **Reduction of fragility**: How much the system reduces dependence on brittle low-level browser control.
- **Reusability**: How effectively learned MCP servers transfer across agents, sessions, and use cases.

## Project Scope

### In Scope

- Framework for exploring and learning web application semantics
- Inference of high-level command sets from application observation
- Compilation of learned operations into MCP server packages
- Repository for storing and retrieving application-specific MCP servers
- Runtime skill for detecting, installing, and using learned MCP servers
- JavaScript command libraries for in-page execution

### Out of Scope

- General-purpose web scraping or data extraction
- Authentication and credential management (handled externally)
- Native desktop or mobile application automation
- Real-time collaborative editing conflict resolution
- Applications behind CAPTCHAs or bot-detection (respected, not bypassed)
