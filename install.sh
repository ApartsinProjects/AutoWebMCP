#!/bin/bash
# =============================================================================
# AutoWebMCP Installer
# Installs skills and templates into your Claude Code project
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}AutoWebMCP Installer${NC}"
echo "=============================="
echo ""

# Determine install directory
INSTALL_DIR="${1:-.}"
if [ ! -d "$INSTALL_DIR" ]; then
  echo "Error: Directory '$INSTALL_DIR' does not exist."
  echo "Usage: ./install.sh [project-directory]"
  exit 1
fi

INSTALL_DIR=$(cd "$INSTALL_DIR" && pwd)
echo "Installing to: $INSTALL_DIR"
echo ""

# 1. Install skills
echo -e "${GREEN}[1/4]${NC} Installing Claude Code skills..."
mkdir -p "$INSTALL_DIR/.claude/skills/learn-webapp"
mkdir -p "$INSTALL_DIR/.claude/skills/webmcp"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cp "$SCRIPT_DIR/skills/learn-webapp/SKILL.md" "$INSTALL_DIR/.claude/skills/learn-webapp/SKILL.md"
cp "$SCRIPT_DIR/skills/learn-webapp/exploration-guide.md" "$INSTALL_DIR/.claude/skills/learn-webapp/exploration-guide.md"
cp "$SCRIPT_DIR/skills/webmcp/SKILL.md" "$INSTALL_DIR/.claude/skills/webmcp/SKILL.md"
echo "  Skills installed to .claude/skills/"

# 2. Install templates
echo -e "${GREEN}[2/4]${NC} Installing MCP server templates..."
mkdir -p "$INSTALL_DIR/src/templates"
cp "$SCRIPT_DIR/src/templates/mcp-server-template.mjs" "$INSTALL_DIR/src/templates/"
cp "$SCRIPT_DIR/src/templates/commands-template.mjs" "$INSTALL_DIR/src/templates/"
cp "$SCRIPT_DIR/src/templates/package-template.json" "$INSTALL_DIR/src/templates/"
echo "  Templates installed to src/templates/"

# 3. Install catalogue
echo -e "${GREEN}[3/4]${NC} Setting up catalogue..."
if [ ! -f "$INSTALL_DIR/catalogue.json" ]; then
  cat > "$INSTALL_DIR/catalogue.json" << 'CATALOGUE'
{
  "version": "2.0.0",
  "repository": "",
  "applications": {}
}
CATALOGUE
  echo "  Created empty catalogue.json"
else
  echo "  catalogue.json already exists, skipping"
fi

# 4. Install dependencies
echo -e "${GREEN}[4/4]${NC} Installing npm dependencies..."
cd "$INSTALL_DIR"
if [ ! -f "package.json" ]; then
  npm init -y > /dev/null 2>&1
  # Set module type
  node -e "const p=require('./package.json'); p.type='module'; require('fs').writeFileSync('package.json', JSON.stringify(p, null, 2))"
fi
npm install --save @modelcontextprotocol/sdk puppeteer-core zod 2>/dev/null
echo "  Dependencies installed"

echo ""
echo "=============================="
echo -e "${GREEN}AutoWebMCP installed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Open your project in Claude Code"
echo "  2. Run: /learn-webapp https://your-app.com"
echo "  3. Approve the generated tools"
echo "  4. Start using MCP tools instead of browser automation"
echo ""
