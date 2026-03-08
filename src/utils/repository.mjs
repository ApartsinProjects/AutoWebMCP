#!/usr/bin/env node
// Repository management utility for AutoWebMCP
// Usage:
//   node repository.mjs list              — List all learned MCP servers
//   node repository.mjs info <app-name>   — Show details for a specific server

import { readFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");
const CATALOGUE_PATH = join(PROJECT_ROOT, "catalogue.json");

function loadCatalogue() {
  if (!existsSync(CATALOGUE_PATH)) {
    return { version: "2.0.0", repository: "", applications: {} };
  }
  return JSON.parse(readFileSync(CATALOGUE_PATH, "utf-8"));
}

function listServers() {
  const catalogue = loadCatalogue();
  const entries = Object.entries(catalogue.applications);

  if (entries.length === 0) {
    console.log("No learned MCP servers in the catalogue.");
    console.log('Use the /learn-webapp skill to learn a web application.');
    return;
  }

  console.log(`\nAutoWebMCP Catalogue — ${entries.length} application(s)\n`);
  console.log("─".repeat(70));

  for (const [name, app] of entries) {
    console.log(`  ${app.displayName || name}`);
    console.log(`    URL:        ${app.url}`);
    for (const mcp of app.mcps) {
      console.log(`    MCP:        ${mcp.name} v${mcp.version} (${mcp.operationCount} ops, ${(mcp.confidence * 100).toFixed(0)}%)`);
      console.log(`    Path:       ${mcp.path}`);
    }
    console.log("─".repeat(70));
  }
}

function showInfo(appName) {
  const catalogue = loadCatalogue();
  const app = catalogue.applications[appName];

  if (!app) {
    console.log(`No application found for "${appName}".`);
    console.log("Available:", Object.keys(catalogue.applications).join(", ") || "(none)");
    return;
  }

  console.log(`\n${app.displayName || appName}`);
  console.log("=".repeat((app.displayName || appName).length));
  console.log(`URL:          ${app.url}`);
  console.log(`URL Pattern:  ${app.urlPattern}`);
  console.log(`MCPs:         ${app.mcps.length}`);

  for (const mcp of app.mcps) {
    console.log(`\n  ${mcp.name} v${mcp.version}`);
    console.log(`  Operations:   ${mcp.operationCount}`);
    console.log(`  Confidence:   ${(mcp.confidence * 100).toFixed(0)}%`);
    console.log(`  Generated:    ${mcp.generatedAt}`);
    console.log(`  Path:         ${mcp.path}`);

    // Try to load manifest for detailed operation info
    const manifestPath = join(PROJECT_ROOT, mcp.path, "manifest.json");
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      if (manifest.operations && manifest.operations.length > 0) {
        console.log(`\n  Operations:`);
        console.log("  " + "─".repeat(66));
        for (const op of manifest.operations) {
          const conf = op.confidence ? ` (${(op.confidence * 100).toFixed(0)}%)` : "";
          console.log(`    ${op.name}${conf}`);
          console.log(`      ${op.description}`);
          console.log(`      Category: ${op.category}`);
        }
      }
    }
  }
}

// CLI
const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "list":
    listServers();
    break;
  case "info":
    if (!args[0]) {
      console.log("Usage: node repository.mjs info <app-name>");
    } else {
      showInfo(args[0]);
    }
    break;
  default:
    console.log("AutoWebMCP Repository Manager");
    console.log("  list              List all learned MCP servers");
    console.log("  info <app-name>   Show details for a specific server");
}
