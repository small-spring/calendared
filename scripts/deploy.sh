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

# unit tests of the plain logic (see docs/development.md); refuse to deploy if any fails
npx vitest run

npx vite build --mode production

# smoke test: refuse to deploy a bundle that crashes while loading (see scripts/check-load.cjs)
node scripts/check-load.cjs main.js

mkdir -p "$DEST"
cp manifest.json main.js styles.css "$DEST/"
echo "Deployed $PLUGIN_ID to $DEST"
