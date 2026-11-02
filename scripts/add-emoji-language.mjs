// Put a language's emoji search keywords straight into a vault's Calendared folder, without downloading.
//
// The plugin downloads them from this repository through jsDelivr or GitHub when the language is added in settings
// (src/emoji-search.ts). While the repository is private neither can reach it, so this writes the same file the
// download would: `.obsidian/plugins/calendared/emoji-keywords/<language>.json`, holding { ref, keywords } with the
// keywords of data/emoji-keywords/ at EMOJI_DATA_REF. Restart Obsidian (or turn the plugin off and on) to use it.
//
// Usage: node scripts/add-emoji-language.mjs <language> [vault_path]   (e.g. `ja`)
// The vault is found like scripts/deploy.sh does: the argument, else OBSIDIAN_VAULT, else .deploy-vault (its first line only)
// Needs the git history (a clone, not a downloaded zip).
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [language, vaultArg] = process.argv.slice(2);
if (!language) {
  console.error("Usage: node scripts/add-emoji-language.mjs <language> [vault_path]");
  process.exit(1);
}
// Calendared: the same vault as scripts/deploy.sh, which has no default vault
const vault = vaultArg ?? (process.env.OBSIDIAN_VAULT || deployVaultFile());
if (!vault) {
  console.error("No vault. Pass one, set OBSIDIAN_VAULT, or write it in .deploy-vault (see docs/guides/development.md)");
  process.exit(1);
}
if (!existsSync(join(vault, ".obsidian"))) {
  console.error(`Not an Obsidian vault: ${vault}`);
  process.exit(1);
}

const source = readFileSync(join(root, "src/emoji-search.ts"), "utf8");
const ref = source.match(/EMOJI_DATA_REF = "([0-9a-f]+)"/)?.[1];
if (!ref) {
  console.error("EMOJI_DATA_REF not found in src/emoji-search.ts");
  process.exit(1);
}

let text;
try {
  text = execFileSync("git", ["show", `${ref}:data/emoji-keywords/${language}.json`], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  console.error(`No keywords for "${language}" at ${ref} (the languages are in data/emoji-keywords/)`);
  process.exit(1);
}

const { id } = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const dir = join(vault, ".obsidian/plugins", id, "emoji-keywords");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${language}.json`), JSON.stringify({ ref, keywords: JSON.parse(text) }));
console.log(`Added ${language} to ${dir}. Restart Obsidian to search in it.`);

/** The first line of .deploy-vault, with a leading ~ for the home folder, or undefined */
function deployVaultFile() {
  const file = join(root, ".deploy-vault");
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8").split("\n").map((l) => l.trim()).find((l) => l);
  return line?.replace(/^~(?=$|\/)/, homedir());
}
