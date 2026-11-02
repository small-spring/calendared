#!/usr/bin/env bash
# Build the plugin and copy it into an Obsidian vault.
# Usage: scripts/deploy.sh [vault_path]
#   The vault is the argument, else OBSIDIAN_VAULT, else the first line of .deploy-vault (kept out of git).
#   Calendared: there is no default vault, so it never goes into someone's own vault by accident
#   DEPLOY_MODE=development: a development build (logs timings, e.g. the vault source's re-reads; see docs/spec/state.md)
set -euo pipefail

cd "$(dirname "$0")/.."

VAULT="${1:-${OBSIDIAN_VAULT:-}}"
if [ -z "$VAULT" ] && [ -f .deploy-vault ]; then
  VAULT="$(grep -v '^[[:space:]]*$' .deploy-vault | head -n 1)"
  VAULT="${VAULT/#\~/$HOME}"
fi
if [ -z "$VAULT" ]; then
  cat >&2 <<'MSG'
No vault to deploy to. Name one (a test vault of your own is safest; see docs/guides/development.md):
  npm run deploy -- ~/path/to/vault
  OBSIDIAN_VAULT=~/path/to/vault npm run deploy
  echo ~/path/to/vault > .deploy-vault     (kept out of git; then just `npm run deploy`)
MSG
  exit 1
fi

PLUGIN_ID="$(node -p "require('./manifest.json').id")"
DEST="$VAULT/.obsidian/plugins/$PLUGIN_ID"

if [ ! -d "$VAULT/.obsidian" ]; then
  echo "Not an Obsidian vault: $VAULT (open the folder as a vault in Obsidian once, then deploy again)" >&2
  exit 1
fi

# unit tests of the plain logic (see docs/guides/development.md); refuse to deploy if any fails
npx vitest run

MODE="${DEPLOY_MODE:-production}"
# import.meta.env.DEV follows NODE_ENV, not --mode
NODE_ENV="$MODE" npx vite build --mode "$MODE"

# smoke test: refuse to deploy a bundle that crashes while loading (see scripts/check-load.cjs)
node scripts/check-load.cjs main.js

mkdir -p "$DEST"
cp manifest.json main.js styles.css "$DEST/"
echo "Deployed $PLUGIN_ID ($MODE) to $DEST"
