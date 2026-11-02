#!/usr/bin/env bash
# Build the plugin and copy it into Obsidian vaults.
# Usage: scripts/deploy.sh [vault_path]
#   The vault is the argument, else OBSIDIAN_VAULT, else every line of .deploy-vault (kept out of git; one vault a
#   line, e.g. a test vault and the vault in daily use, built once and copied into each).
#   Calendared: there is no default vault, so it never goes into someone's own vault by accident
#   DEPLOY_MODE=development: a development build (logs timings, e.g. the vault source's re-reads; see docs/spec/state.md)
set -euo pipefail

cd "$(dirname "$0")/.."

VAULTS=()
if [ -n "${1:-${OBSIDIAN_VAULT:-}}" ]; then
  VAULTS=("${1:-$OBSIDIAN_VAULT}")
elif [ -f .deploy-vault ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [ -n "$line" ] && VAULTS+=("${line/#\~/$HOME}")
  done < .deploy-vault
fi
if [ ${#VAULTS[@]} -eq 0 ]; then
  cat >&2 <<'MSG'
No vault to deploy to. Name one (a test vault of your own is safest; see docs/guides/development.md):
  npm run deploy -- ~/path/to/vault
  OBSIDIAN_VAULT=~/path/to/vault npm run deploy
  echo ~/path/to/vault > .deploy-vault     (kept out of git, one vault a line; then just `npm run deploy`)
MSG
  exit 1
fi

PLUGIN_ID="$(node -p "require('./manifest.json').id")"

# check every vault before building, so a typo doesn't leave one vault updated and another not
for VAULT in "${VAULTS[@]}"; do
  if [ ! -d "$VAULT/.obsidian" ]; then
    echo "Not an Obsidian vault: $VAULT (open the folder as a vault in Obsidian once, then deploy again)" >&2
    exit 1
  fi
done

# unit tests of the plain logic (see docs/guides/development.md); refuse to deploy if any fails
npx vitest run

MODE="${DEPLOY_MODE:-production}"
# import.meta.env.DEV follows NODE_ENV, not --mode
NODE_ENV="$MODE" npx vite build --mode "$MODE"

# smoke test: refuse to deploy a bundle that crashes while loading (see scripts/check-load.cjs)
node scripts/check-load.cjs main.js

for VAULT in "${VAULTS[@]}"; do
  DEST="$VAULT/.obsidian/plugins/$PLUGIN_ID"
  mkdir -p "$DEST"
  cp manifest.json main.js styles.css "$DEST/"
  echo "Deployed $PLUGIN_ID ($MODE) to $DEST"
done
