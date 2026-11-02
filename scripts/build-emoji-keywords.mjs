// Generate localized search keywords for the emoji picker from Unicode CLDR annotations.
//
// Output: data/emoji-keywords/<locale>.json, mapping each emoji-mart emoji id to the locale's keywords,
// e.g. { "+1": ["いいね", "グッド", "サムズアップ", "親指", ...] }. The plugin downloads the file for Obsidian's
// language when the user turns on searching in it, and merges it into emoji-mart's data (src/ui/utils/emoji-locale.ts,
// docs/features/stickers.md). The files are not bundled: all languages together are about 3.4 MB.
//
// Usage: node scripts/build-emoji-keywords.mjs [locale ...]   (default: every language emoji-mart translates its text to)
// Needs the dev dependencies cldr-annotations-full and cldr-annotations-derived-full (flags, keycaps, skin tones).
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "data/emoji-keywords");
// keep in step with EMOJI_SEARCH_LANGUAGES in src/emoji-search.ts (Sanskrit is left out: CLDR has almost no emoji words in it)
const ALL = ["ar", "be", "cs", "de", "es", "fa", "fi", "fr", "hi", "it", "ja", "ko", "nl", "pl", "pt", "ru", "tr", "uk", "vi", "zh"];
const locales = process.argv.slice(2).length ? process.argv.slice(2) : ALL;

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
