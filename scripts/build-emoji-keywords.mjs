// Generate localized search keywords for the emoji picker from Unicode CLDR annotations.
//
// Output: src/ui/utils/emoji-keywords/<locale>.json, mapping each emoji-mart emoji id to the locale's keywords,
// e.g. { "+1": ["いいね", "グッド", "サムズアップ", "親指", ...] }. The plugin merges these into emoji-mart's
// data so the picker can be searched in that language (see src/ui/utils/emoji-locale.ts).
//
// Usage: node scripts/build-emoji-keywords.mjs [locale ...]   (default: ja)
// Needs the dev dependencies cldr-annotations-full and cldr-annotations-derived-full (flags, keycaps, skin tones).
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src/ui/utils/emoji-keywords");
const locales = process.argv.slice(2).length ? process.argv.slice(2) : ["ja"];

const emojiMart = JSON.parse(readFileSync(require.resolve("@emoji-mart/data/sets/15/native.json"), "utf8"));

// CLDR keys usually omit the emoji presentation selector (U+FE0F), e.g. "✈" for "✈️"
const normalize = (s) => s.replace(/️/g, "");

mkdirSync(outDir, { recursive: true });
for (const locale of locales) {
  const base = require(`cldr-annotations-full/annotations/${locale}/annotations.json`).annotations.annotations;
  const derived = require(`cldr-annotations-derived-full/annotationsDerived/${locale}/annotations.json`)
    .annotationsDerived.annotations;
  const annotations = new Map(
    Object.entries({ ...derived, ...base }).map(([emoji, value]) => [normalize(emoji), value]),
  );

  const keywords = {};
  let missing = 0;
  for (const emoji of Object.values(emojiMart.emojis)) {
    const annotation = annotations.get(normalize(emoji.skins[0].native));
    if (!annotation) {
      missing++;
      continue;
    }
    // the spoken name ("tts") can be "旗: 日本" for flags: keep both parts as keywords
    const names = (annotation.tts ?? []).flatMap((name) => name.split(/\s*[:：]\s*/));
    keywords[emoji.id] = [...new Set([...names, ...(annotation.default ?? [])])].filter(Boolean);
  }

  const outFile = join(outDir, `${locale}.json`);
  writeFileSync(outFile, JSON.stringify(keywords) + "\n");
  const size = Math.round(readFileSync(outFile).length / 1024);
  console.log(`${locale}: ${Object.keys(keywords).length} emoji with keywords, ${missing} without, ${size} KB -> ${outFile}`);
}
