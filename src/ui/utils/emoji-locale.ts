// Calendared: search the emoji picker in Obsidian's display language.
//
// emoji-mart only searches its English names and keywords, and fetches non-English interface text from a CDN unless
// given it. For each supported language we bundle (a) keywords generated from Unicode CLDR annotations
// (scripts/build-emoji-keywords.mjs) and merge them into emoji-mart's data, and (b) emoji-mart's own translation of
// its interface text. Other languages get the English picker. See docs/stickers.md.
import rawData, { type EmojiMartData } from "@emoji-mart/data";
import jaI18n from "@emoji-mart/data/i18n/ja.json";
import { getLanguage } from "obsidian";
import jaKeywords from "./emoji-keywords/ja.json";

type TEmojiData = EmojiMartData;
// the package's type file describes the data's shape but not its default export
const data = rawData as unknown as EmojiMartData;
type TEmojiLocale = { keywords: Record<string, string[]>; i18n: Record<string, unknown> };

/** Languages with localized search; to add one, generate its keywords and import its emoji-mart i18n here */
const LOCALES: Record<string, TEmojiLocale> = {
  ja: { keywords: jaKeywords, i18n: jaI18n },
};

function getObsidianLanguage(): string {
  // getLanguage() exists since Obsidian 1.8; older versions keep the language in localStorage
  try {
    if (typeof getLanguage === "function") return getLanguage();
  } catch {
    // fall through
  }
  return window.localStorage.getItem("language") || "en";
}

const localizedData = new Map<string, TEmojiData>();

/** Options for the emoji-mart Picker: data with the language's keywords merged in, plus its interface text */
export function getEmojiPickerLocale(): { data: TEmojiData; locale: string; i18n?: Record<string, unknown> } {
  const language = getObsidianLanguage();
  const emojiLocale = LOCALES[language];
  if (!emojiLocale) return { data, locale: "en" };

  let merged = localizedData.get(language);
  if (!merged) {
    const emojis = Object.fromEntries(
      Object.entries(data.emojis).map(([id, emoji]) => {
        const extra = emojiLocale.keywords[id];
        return [id, extra ? { ...emoji, keywords: [...emoji.keywords, ...extra] } : emoji];
      }),
    );
    merged = { ...data, emojis };
    localizedData.set(language, merged);
  }
  return { data: merged, locale: language, i18n: emojiLocale.i18n };
}
