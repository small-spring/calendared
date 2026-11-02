// Calendared: the sticker picker in Obsidian's display language.
//
// emoji-mart only searches its English names and keywords, and fetches non-English interface text from a CDN unless
// given it. Its interface text is bundled for every language it translates to, and shown in Obsidian's language. Search
// words in those languages are downloaded when the user adds the language in the settings (src/emoji-search.ts,
// docs/features/stickers.md), and the picker searches in every installed language besides English.
//
// emoji-mart keeps the data object it is first given and builds each emoji's search string only when it's missing, every
// time a picker is created. So the picker is always given the same object, and changing the keywords edits it in place
// and drops the search strings: the next picker searches the new words. (After the plugin is turned off and on without
// restarting Obsidian, the picker from the earlier load keeps its own data until Obsidian restarts.)
import rawData, { type EmojiMartData } from "@emoji-mart/data";
import arI18n from "@emoji-mart/data/i18n/ar.json";
import beI18n from "@emoji-mart/data/i18n/be.json";
import csI18n from "@emoji-mart/data/i18n/cs.json";
import deI18n from "@emoji-mart/data/i18n/de.json";
import esI18n from "@emoji-mart/data/i18n/es.json";
import faI18n from "@emoji-mart/data/i18n/fa.json";
import fiI18n from "@emoji-mart/data/i18n/fi.json";
import frI18n from "@emoji-mart/data/i18n/fr.json";
import hiI18n from "@emoji-mart/data/i18n/hi.json";
import itI18n from "@emoji-mart/data/i18n/it.json";
import jaI18n from "@emoji-mart/data/i18n/ja.json";
import koI18n from "@emoji-mart/data/i18n/ko.json";
import nlI18n from "@emoji-mart/data/i18n/nl.json";
import plI18n from "@emoji-mart/data/i18n/pl.json";
import ptI18n from "@emoji-mart/data/i18n/pt.json";
import ruI18n from "@emoji-mart/data/i18n/ru.json";
import trI18n from "@emoji-mart/data/i18n/tr.json";
import ukI18n from "@emoji-mart/data/i18n/uk.json";
import viI18n from "@emoji-mart/data/i18n/vi.json";
import zhI18n from "@emoji-mart/data/i18n/zh.json";
import { getLanguage, Notice, requestUrl, type App } from "obsidian";
import { writable } from "svelte/store";
import {
  EMOJI_DATA_REF,
  EMOJI_SEARCH_LANGUAGES,
  EmojiKeywordStore,
  emojiDataUrls,
  emojiSearchLanguage,
  mergeKeywords,
  type EmojiKeywords,
  type EmojiSearchLanguage,
} from "@/emoji-search";

type TEmojiData = EmojiMartData;
// the package's type file describes the data's shape but not its default export
const data = rawData as unknown as EmojiMartData;
/** each emoji's own (English) keywords, to go back to when the language's are turned off */
const english = Object.fromEntries(
  Object.entries(data.emojis).map(([id, emoji]) => [id, { keywords: [...emoji.keywords] }]),
);

const I18N: Record<EmojiSearchLanguage, Record<string, unknown>> = {
  ar: arI18n,
  be: beI18n,
  cs: csI18n,
  de: deI18n,
  es: esI18n,
  fa: faI18n,
  fi: fiI18n,
  fr: frI18n,
  hi: hiI18n,
  it: itI18n,
  ja: jaI18n,
  ko: koI18n,
  nl: nlI18n,
  pl: plI18n,
  pt: ptI18n,
  ru: ruI18n,
  tr: trI18n,
  uk: ukI18n,
  vi: viI18n,
  zh: zhI18n,
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

/** Options for the emoji-mart Picker: the data (with the language's keywords if turned on) and its interface text */
export function getEmojiPickerLocale(): { data: TEmojiData; locale: string; i18n?: Record<string, unknown> } {
  const language = emojiSearchLanguage(getObsidianLanguage());
  if (!language) return { data, locale: "en" };
  return { data, locale: language, i18n: I18N[language] };
}

/** emoji-mart's data with the English keywords plus those of every installed language */
function useKeywords() {
  const merged = [...installed.values()].reduce((emojis, keywords) => mergeKeywords({ emojis }, keywords).emojis, english);
  for (const [id, emoji] of Object.entries(data.emojis)) {
    emoji.keywords = merged[id]?.keywords ?? emoji.keywords;
    delete (emoji as { search?: string }).search;
  }
}

/** For the settings: the installed languages (saved in the plugin's folder) and those being downloaded */
export const emojiSearchState = writable<{ installed: EmojiSearchLanguage[]; downloading: EmojiSearchLanguage[] }>({
  installed: [],
  downloading: [],
});

/** The installed languages' keywords; the files in the plugin's folder are the record of what is installed */
const installed = new Map<EmojiSearchLanguage, EmojiKeywords>();
let store: EmojiKeywordStore | null = null;

function publish() {
  emojiSearchState.update((s) => ({ ...s, installed: EMOJI_SEARCH_LANGUAGES.filter((l) => installed.has(l)) }));
  useKeywords();
}

/** Obsidian's display language if it has search words (suggested first when adding languages) */
export function suggestedEmojiLanguage(): EmojiSearchLanguage | null {
  return emojiSearchLanguage(getObsidianLanguage());
}

/** When the plugin loads: search in the languages saved in the plugin's folder. Never downloads */
export async function initEmojiSearch(app: App, pluginFolder: string) {
  const adapter = app.vault.adapter;
  store = new EmojiKeywordStore({
    folder: pluginFolder,
    ref: EMOJI_DATA_REF,
    urls: (language) => emojiDataUrls(language, EMOJI_DATA_REF, import.meta.env.VITE_EMOJI_DATA_BASE as string | undefined),
    files: {
      exists: (path) => adapter.exists(path),
      read: (path) => adapter.read(path),
      write: (path, text) => adapter.write(path, text),
      remove: (path) => adapter.remove(path),
      mkdir: (path) => adapter.mkdir(path),
      list: async (path) => (await adapter.list(path)).files,
    },
    request: async (url) => (await requestUrl({ url })).text,
  });

  for (const language of await store.list()) {
    const keywords = await store.load(language);
    if (keywords) installed.set(language, keywords);
  }
  publish();
}

const languageName = (language: string) => new Intl.DisplayNames(["en"], { type: "language" }).of(language) ?? language;

/** Download the languages' search words (only when the user asks to) and search in them too */
export async function downloadEmojiLanguages(languages: EmojiSearchLanguage[]) {
  if (!store || languages.length === 0) return;
  const target = store;
  emojiSearchState.update((s) => ({ ...s, downloading: [...s.downloading, ...languages] }));
  const failed: EmojiSearchLanguage[] = [];
  await Promise.all(
    languages.map(async (language) => {
      try {
        installed.set(language, await target.download(language));
      } catch (error) {
        console.error(`Calendared: couldn't download the emoji search words for ${language}`, error);
        failed.push(language);
      }
    }),
  );
  emojiSearchState.update((s) => ({ ...s, downloading: s.downloading.filter((l) => !languages.includes(l)) }));
  publish();
  if (failed.length) {
    new Notice(`Couldn't download the emoji search words for ${failed.map(languageName).join(", ")}. Check your connection and try again.`);
  }
}

/** Delete a language's saved search words and stop searching in it */
export async function removeEmojiLanguage(language: EmojiSearchLanguage) {
  if (!store) return;
  await store.remove(language);
  installed.delete(language);
  publish();
}
