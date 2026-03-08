# AutoWebMCP — Project Requirements Document

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements for AutoWebMCP, a framework that derives reusable MCP servers from interaction-heavy web applications by learning semantic operations through controlled experimentation.

### 1.2 Definitions

| Term                  | Definition                                                                                       |
|-----------------------|--------------------------------------------------------------------------------------------------|
| MCP Server            | A Model Context Protocol server exposing a set of tools callable by an LLM agent.                |
| Semantic Operation    | A high-level, user-meaningful command (e.g., "send message") as opposed to a low-level browser action. |
| Command Library       | A JavaScript module containing executable procedures for all learned operations in an application. |
| Learning Phase        | The offline process of exploring a web application to infer its semantic operations.             |
| Runtime Phase         | The online process of detecting, loading, and using a learned MCP server during agent execution.  |
| Application Profile   | A descriptor identifying a target web application and its learned capabilities.                  |
| Exploration Skill     | A Claude Code skill responsible for probing and learning from a target web application.          |
| Runtime Skill         | A Claude skill that detects supported applications and activates corresponding MCP servers.       |

---

## 2. System Architecture Requirements

### 2.1 Phase Separation

- **REQ-ARCH-01**: The system MUST separate the learning phase from the runtime phase as distinct execution contexts.
- **REQ-ARCH-02**: The learning phase MUST NOT depend on runtime infrastructure, and the runtime phase MUST NOT require learning capabilities.
- **REQ-ARCH-03**: The only artifact shared between phases is the compiled MCP server package stored in the repository.

### 2.2 Component Structure

- **REQ-ARCH-04**: The system MUST consist of the following top-level components:
  1. **Exploration Engine** — drives learning-phase experimentation.
  2. **Operation Inference Module** — derives semantic operations from exploration signals.
  3. **Command Compiler** — produces executable JavaScript command libraries.
  4. **MCP Server Generator** — wraps command libraries into MCP server packages.
  5. **MCP Server Repository** — stores and indexes published MCP servers.
  6. **Runtime Resolver** — detects target applications and loads matching MCP servers.

- **REQ-ARCH-05**: Each component MUST have a well-defined interface and be independently testable.

---

## 3. Learning Phase Requirements

### 3.1 Application Exploration

- **REQ-LEARN-01**: The exploration engine MUST be implemented as one or more Claude Code skills.
- **REQ-LEARN-02**: The exploration engine MUST be able to interact with a live instance of the target web application through browser control tools.
- **REQ-LEARN-03**: The exploration engine MUST support the following exploration strategies:
  - **DOM inspection**: Reading and analyzing page structure, element attributes, and component hierarchies.
  - **Element modification**: Programmatically altering element properties, attributes, and content to observe effects.
  - **Action execution**: Performing user-like actions (clicks, typing, navigation) and capturing resulting changes.
  - **Event tracing**: Observing DOM mutation events, network requests, and console output triggered by actions.
  - **Visual diffing**: Detecting visual and structural changes between pre-action and post-action states.

- **REQ-LEARN-04**: The exploration engine MUST record all observations in a structured exploration log for downstream analysis.
- **REQ-LEARN-05**: The exploration engine MUST handle errors and unexpected application states gracefully without crashing the target application.

### 3.2 Operation Inference

- **REQ-LEARN-06**: The inference module MUST derive candidate semantic operations from exploration logs.
- **REQ-LEARN-07**: Each inferred operation MUST include:
  - A descriptive name reflecting user intent (e.g., `compose_message`, `edit_cell`).
  - A natural-language description of what the operation does.
  - A parameter schema specifying required and optional inputs.
  - A return schema describing what the operation produces or confirms.
  - An executable procedure (sequence of browser/DOM actions) that realizes the operation.

- **REQ-LEARN-08**: The inference module MUST categorize operations by domain:
  - **Navigation**: Moving between views, pages, or application states.
  - **Data Entry**: Filling forms, editing fields, setting values.
  - **Content Editing**: Formatting text, manipulating structured content blocks.
  - **Messaging**: Composing, sending, replying, forwarding messages.
  - **Workflow Triggers**: Submitting forms, approving items, changing statuses.
  - **Data Retrieval**: Reading values, listing items, querying visible state.

- **REQ-LEARN-09**: The inference module MUST validate each inferred operation by re-executing its procedure and confirming the expected outcome.
- **REQ-LEARN-10**: The inference module SHOULD detect and eliminate redundant or overlapping operations.

### 3.3 Iterative Refinement

- **REQ-LEARN-11**: The learning process MUST support iterative refinement — re-exploring areas where initial inference was incomplete or produced unreliable procedures.
- **REQ-LEARN-12**: The system SHOULD track confidence levels for each inferred operation based on validation success rate.
- **REQ-LEARN-13**: Operations below a configurable confidence threshold MUST be flagged for review rather than included in the final output.

---

## 4. Command Compilation Requirements

### 4.1 Command Library

- **REQ-COMP-01**: Each learned application MUST produce a self-contained JavaScript command library.
- **REQ-COMP-02**: The command library MUST export each semantic operation as an async function.
- **REQ-COMP-03**: Each function MUST:
  - Accept parameters matching the inferred parameter schema.
  - Execute the learned procedure within the page context.
  - Return a structured result indicating success/failure and any output data.
  - Handle common failure modes (element not found, timeout, unexpected state) with descriptive errors.

- **REQ-COMP-04**: The command library MUST NOT depend on external runtime dependencies beyond the browser environment and the MCP server framework.
- **REQ-COMP-05**: The command library MUST include built-in wait/retry logic for asynchronous UI updates.

### 4.2 Robustness

- **REQ-COMP-06**: Learned procedures SHOULD use multiple selector strategies (ID, role, text content, structural position) with fallback chains to tolerate minor DOM changes.
- **REQ-COMP-07**: The command library SHOULD include pre-condition checks (e.g., verifying the application is in the expected state) before executing operations.
- **REQ-COMP-08**: The command library MUST include a health-check function that verifies basic connectivity and application readiness.

---

## 5. MCP Server Requirements

### 5.1 Server Generation

- **REQ-MCP-01**: The MCP server generator MUST produce a valid MCP server package from a command library.
- **REQ-MCP-02**: Each MCP server MUST expose every semantic operation as an MCP tool with:
  - A tool name matching the operation name.
  - A JSON Schema for input parameters.
  - A description suitable for LLM tool selection.

- **REQ-MCP-03**: The MCP server MUST include metadata:
  - Target application identifier (name, URL pattern, version if applicable).
  - List of exposed operations with descriptions.
  - Generation timestamp and framework version.
  - Confidence scores per operation.

- **REQ-MCP-04**: The MCP server MUST follow MCP protocol conventions for transport (stdio or HTTP/SSE as appropriate).

### 5.2 Server Packaging

- **REQ-MCP-05**: Each MCP server MUST be packaged as a self-contained, installable unit (e.g., npm package or directory with manifest).
- **REQ-MCP-06**: The package MUST include:
  - The MCP server entry point.
  - The compiled command library.
  - A manifest describing the target application and available operations.
  - Installation and configuration instructions.

---

## 6. Repository Requirements

### 6.1 Storage and Indexing

- **REQ-REPO-01**: The repository MUST store published MCP server packages indexed by target application.
- **REQ-REPO-02**: The repository MUST support lookup by:
  - Application name.
  - URL pattern (domain, path prefix).
  - Operation name or category.

- **REQ-REPO-03**: The repository MUST support versioning — multiple versions of an MCP server for the same application MAY coexist.
- **REQ-REPO-04**: Each repository entry MUST include the server manifest for inspection without downloading the full package.

### 6.2 Publication

- **REQ-REPO-05**: The learning phase MUST be able to publish a new MCP server to the repository upon successful compilation.
- **REQ-REPO-06**: Publication MUST validate that the package conforms to the required structure and metadata format.

### 6.3 Repository Implementation

- **REQ-REPO-07**: The initial implementation MUST support a local filesystem-based repository.
- **REQ-REPO-08**: The repository interface MUST be abstracted to allow future backends (Git repository, npm registry, cloud storage).

---

## 7. Runtime Phase Requirements

### 7.1 Application Detection

- **REQ-RT-01**: The runtime resolver MUST be implemented as a Claude skill.
- **REQ-RT-02**: The runtime resolver MUST detect when the agent is interacting with a web application that has a matching MCP server in the repository.
- **REQ-RT-03**: Detection MUST be based on URL patterns and application identifiers, not on DOM structure.

### 7.2 MCP Server Activation

- **REQ-RT-04**: When a match is found, the runtime resolver MUST install and activate the corresponding MCP server, making its tools available to the agent.
- **REQ-RT-05**: Installation MUST be idempotent — re-activating an already-active MCP server MUST NOT cause errors.
- **REQ-RT-06**: The runtime resolver MUST handle version selection when multiple versions exist (default: latest).

### 7.3 Fallback Behavior

- **REQ-RT-07**: If no matching MCP server exists for a detected application, the runtime resolver MUST NOT block the agent — standard browser tools remain available.
- **REQ-RT-08**: The runtime resolver SHOULD notify the agent that no learned tool layer is available for the current application.
- **REQ-RT-09**: If a learned operation fails at runtime, the MCP server MUST return a descriptive error rather than silently falling back to low-level actions.

---

## 8. Non-Functional Requirements

### 8.1 Reliability

- **REQ-NF-01**: Learned operations MUST achieve a minimum 90% success rate on validation runs before being included in a published MCP server.
- **REQ-NF-02**: The command library MUST handle transient failures (slow loading, animation delays) through configurable timeouts and retries.

### 8.2 Performance

- **REQ-NF-03**: MCP server startup time MUST be under 5 seconds.
- **REQ-NF-04**: Individual operation execution time SHOULD be within 2x of the equivalent manual user action time.

### 8.3 Maintainability

- **REQ-NF-05**: The framework MUST be structured so that adding support for a new application does not require modifying core framework code.
- **REQ-NF-06**: Exploration strategies MUST be pluggable — new strategies can be added without changing the exploration engine core.

### 8.4 Security

- **REQ-NF-07**: The learning phase MUST NOT store or transmit credentials or sensitive user data.
- **REQ-NF-08**: Command libraries MUST NOT execute arbitrary code received from the target application.
- **REQ-NF-09**: The MCP server MUST validate all input parameters against the declared schema before execution.

### 8.5 Observability

- **REQ-NF-10**: The learning phase MUST produce structured logs suitable for debugging and auditing inference decisions.
- **REQ-NF-11**: The runtime MCP server MUST log operation invocations and outcomes for monitoring.

---

## 9. Success Criteria

| Criterion                  | Measure                                                                                   |
|----------------------------|-------------------------------------------------------------------------------------------|
| Command Coverage           | The learned MCP server exposes ≥80% of the primary user workflows in the target app.      |
| Execution Reliability      | Learned operations succeed ≥90% of the time across repeated runs.                         |
| Fragility Reduction        | Operations remain functional after minor UI updates without re-learning.                  |
| Reusability                | A learned MCP server can be used by a different agent session without modification.        |
| Learning Efficiency        | A new application can be learned within a bounded exploration budget (time/actions).       |

---

## 10. Constraints and Assumptions

### 10.1 Constraints

- The framework operates within the capabilities of Claude Code skills and available browser control MCP tools.
- Target applications must be accessible through a browser (no native apps).
- The framework respects all bot-detection and CAPTCHA mechanisms — it does not bypass them.

### 10.2 Assumptions

- Target applications are deterministic enough that repeated actions produce consistent results.
- The agent has legitimate access to the target application (authentication is handled externally).
- Target applications use standard web technologies (HTML, CSS, JavaScript) and render in a modern browser.
- The MCP protocol and tooling ecosystem remain stable across the project lifecycle.

---

## 11. Open Questions

1. **Exploration budget**: What is a reasonable upper bound on exploration actions per application before the learning phase should terminate?
2. **Versioning strategy**: When should a learned MCP server be re-learned vs. patched when the target application changes?
3. **Multi-page workflows**: How should the framework handle operations that span multiple page navigations or require maintaining state across views?
4. **Dynamic content**: How should the framework handle applications with highly dynamic content (infinite scroll, real-time updates)?
5. **Operation composability**: Should the framework support composite operations built from learned primitives, or should each operation be self-contained?
