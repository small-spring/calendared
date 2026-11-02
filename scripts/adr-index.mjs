// Calendared: rewrite the ADR table in docs/adr/README.md from each ADR's properties (front matter).
// Run with `npm run adr` after adding or changing an ADR. `--check` exits with 1 when the table is out of date.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "docs", "adr");
const readme = join(dir, "README.md");
const START = "<!-- adr-index:start -->";
const END = "<!-- adr-index:end -->";

function frontMatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const props = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w+): (.*)$/);
    if (kv) props[kv[1]] = kv[2].replace(/^"(.*)"$/, "$1").replace(/\\"/g, '"');
  }
  return props;
}

const rows = readdirSync(dir)
  .filter((name) => /^\d{4}-.+\.md$/.test(name))
  .sort()
  .map((name) => {
    const p = frontMatter(readFileSync(join(dir, name), "utf8"));
    if (!p) throw new Error(`${name}: no front matter`);
    // a rejected or replaced decision is not work left to do
    const made = p.status === "却下" || p.status === "置き換え" ? "―" : p.implemented === "true" ? "済" : "まだ";
    return `| [${p.id}](${name}) | ${p.title} | ${p.area} | ${p.status} | ${p.date} | ${made} |`;
  });

const table = [
  START,
  "| ID | 決めたこと | 分野 | 状態 | 日付 | 作った |",
  "| --- | --- | --- | --- | --- | --- |",
  ...rows,
  END,
].join("\n");

const current = readFileSync(readme, "utf8");
const next = current.replace(new RegExp(`${START}[\\s\\S]*?${END}`), table);
if (process.argv.includes("--check")) {
  if (next !== current) {
    console.error("docs/adr/README.md is out of date. Run `npm run adr`.");
    process.exit(1);
  }
} else {
  writeFileSync(readme, next);
}
