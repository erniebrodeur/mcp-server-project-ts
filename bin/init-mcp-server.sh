#!/usr/bin/env bash
# init-mcp-server.sh – one‑time dev setup for MCP server
set -euo pipefail

TARGET_DIR="${1:-.mcp-server}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(pwd)"

if [[ -d "$TARGET_DIR/.git" ]]; then
  echo "Directory '$TARGET_DIR' already initialized. Aborting."
  exit 1
fi

echo "Scaffolding MCP server in '$TARGET_DIR'..."
mkdir -p "$TARGET_DIR"

cp "$SCRIPT_DIR/../package.json" "$TARGET_DIR/"
cp "$SCRIPT_DIR/../tsconfig.json" "$TARGET_DIR/"
cp "$SCRIPT_DIR/../schema.sql" "$TARGET_DIR/"
cp "$SCRIPT_DIR/../project.json" "$TARGET_DIR/"
cp "$SCRIPT_DIR/../design_notes.md" "$TARGET_DIR/"
cp -R "$SCRIPT_DIR/../src" "$TARGET_DIR/"
cp "$SCRIPT_DIR/../.gitignore" "$TARGET_DIR/"
cp "$SCRIPT_DIR/../.editorconfig" "$TARGET_DIR/"

echo "Initializing git repository..."
(cd "$TARGET_DIR" && git init -q && git add . && git commit -q -m "chore(init): initial MCP server scaffold")

echo "Installing dependencies..."
(cd "$TARGET_DIR" && npm install)

echo "Setup complete! Next steps:"
echo "  cd $TARGET_DIR"
echo "  npm run watch   # develop with hot reload"
echo "  npm run build && npm run start -- --workspaceRoot "$ROOT_DIR""