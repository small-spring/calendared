#!/usr/bin/env bash
# Build the plugin and copy it into an Obsidian vault.
# Usage: scripts/deploy.sh [vault_path]   (or set OBSIDIAN_VAULT)
set -euo pipefail

cd "$(dirname "$0")/.."

VAULT="${1:-${OBSIDIAN_VAULT:-$HOME/Documents/Obsidian/private}}"
PLUGIN_ID="$(node -p "require('./manifest.json').id")"
DEST="$VAULT/.obsidian/plugins/$PLUGIN_ID"

if [ ! -d "$VAULT/.obsidian" ]; then
  echo "Not an Obsidian vault: $VAULT" >&2
  exit 1
fi

npx vite build --mode production

mkdir -p "$DEST"
cp manifest.json main.js styles.css "$DEST/"
echo "Deployed $PLUGIN_ID to $DEST"
