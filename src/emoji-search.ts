/**
 * Calendared: searching the sticker picker in other languages besides English, which emoji-mart searches already.
 * Keywords for other languages (data/emoji-keywords/, made from Unicode CLDR) are not bundled: all of them together are
 * about 3.4 MB. The user adds languages from a list in the sticker settings (docs/adr/0037); each added language's file
 * is downloaded once and kept in the plugin's folder, and removing the language deletes it. Nothing but the file name
 * (the language) is sent (README, "Network use")
 */

/**
 * Languages with a keyword file in data/emoji-keywords/: those emoji-mart translates its own text to, less Sanskrit
 * (CLDR has almost no emoji words in it, so its file would be empty)
 */
export const EMOJI_SEARCH_LANGUAGES = [
  "ar", "be", "cs", "de", "es", "fa", "fi", "fr", "hi", "it", "ja",
  "ko", "nl", "pl", "pt", "ru", "tr", "uk", "vi", "zh",
] as const;
export type EmojiSearchLanguage = (typeof EMOJI_SEARCH_LANGUAGES)[number];

/** Each language's file size in KB, shown before downloading (a test keeps it in step with data/emoji-keywords/) */
export const EMOJI_DATA_SIZES_KB: Record<EmojiSearchLanguage, number> = {
  ar: 211,
  be: 163,
  cs: 216,
  de: 144,
  es: 114,
  fa: 185,
  fi: 120,
  fr: 154,
  hi: 263,
  it: 178,
  ja: 137,
  ko: 160,
  nl: 141,
  pl: 157,
  pt: 147,
  ru: 226,
  tr: 144,
  uk: 234,
  vi: 137,
  zh: 125,
};

/**
 * The tag of this repository whose data/emoji-keywords/ the plugin downloads (ADR-0056). A tag that is never moved, not a
 * branch, so the files never change under a released plugin; after regenerating the files, push a new tag
 * (`emoji-data-<n+1>`) and write it here (docs/guides/development.md)
 */
export const EMOJI_DATA_REF = "emoji-data-1";

const REPOSITORY = "small-spring/calendared";

/** The keyword file for Obsidian's display language, or null (English, which emoji-mart searches already, or no file) */
export function emojiSearchLanguage(obsidianLanguage: string): EmojiSearchLanguage | null {
  const code = obsidianLanguage.toLowerCase();
  // Traditional Chinese isn't written like the simplified Chinese file
  if (code.startsWith("zh-") && code !== "zh-cn") return null;
  const base = code.split("-")[0];
  return (EMOJI_SEARCH_LANGUAGES as readonly string[]).includes(base) ? (base as EmojiSearchLanguage) : null;
}

/** Where to download a language's file from, in order: jsDelivr, then GitHub. `base` replaces both (development) */
export function emojiDataUrls(language: string, ref: string, base?: string): string[] {
  const path = `data/emoji-keywords/${language}.json`;
  if (base) return [`${base.replace(/\/?$/, "/")}${path}`];
  return [
    `https://cdn.jsdelivr.net/gh/${REPOSITORY}@${ref}/${path}`,
    `https://raw.githubusercontent.com/${REPOSITORY}/${ref}/${path}`,
  ];
}

export type EmojiKeywords = Record<string, string[]>;

/** The keywords in a downloaded or saved file, or null if it isn't a non-empty map of emoji ids to lists of words */
export function parseKeywords(text: string): EmojiKeywords | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return null;
  const valid = entries.every(([, words]) => Array.isArray(words) && words.every((word) => typeof word === "string"));
  return valid ? (value as EmojiKeywords) : null;
}

/** emoji-mart's data with the language's keywords added after its English ones */
export function mergeKeywords<T extends { emojis: Record<string, { keywords: string[] }> }>(
  data: T,
  keywords: EmojiKeywords,
): T {
  const emojis = Object.fromEntries(
    Object.entries(data.emojis).map(([id, emoji]) => {
      const extra = keywords[id];
      return [id, extra ? { ...emoji, keywords: [...emoji.keywords, ...extra] } : emoji];
    }),
  );
  return { ...data, emojis };
}

/** The keyword files kept in the plugin's folder (`emoji-keywords/<language>.json`), and downloading them */
export class EmojiKeywordStore {
  constructor(
    private deps: {
      /** the plugin's folder in the vault (`manifest.dir`, under Obsidian's configuration folder) */
      folder: string;
      ref: string;
      urls: (language: string) => string[];
      files: {
        exists(path: string): Promise<boolean>;
        read(path: string): Promise<string>;
        write(path: string, text: string): Promise<void>;
        remove(path: string): Promise<void>;
        mkdir(path: string): Promise<void>;
        /** the paths of the files in a folder (the folder exists) */
        list(path: string): Promise<string[]>;
      };
      request(url: string): Promise<string>;
    },
  ) {}

  private get dir() {
    return `${this.deps.folder}/emoji-keywords`;
  }

  private path(language: string) {
    return `${this.dir}/${language}.json`;
  }

  /** The saved keywords, if they are from the current data version; never downloads */
  async load(language: string): Promise<EmojiKeywords | null> {
    const { files, ref } = this.deps;
    if (!(await files.exists(this.path(language)))) return null;
    try {
      const saved = JSON.parse(await files.read(this.path(language))) as { ref?: unknown; keywords?: unknown };
      if (saved.ref !== ref) return null;
      return parseKeywords(JSON.stringify(saved.keywords));
    } catch {
      return null;
    }
  }

  /** Download the language's keywords and save them; throws if no source gives a valid file */
  async download(language: string): Promise<EmojiKeywords> {
    const { files, ref } = this.deps;
    let lastError: unknown = null;
    for (const url of this.deps.urls(language)) {
      try {
        const keywords = parseKeywords(await this.deps.request(url));
        if (!keywords) throw new Error(`Not a keyword file: ${url}`);
        if (!(await files.exists(this.dir))) await files.mkdir(this.dir);
        await files.write(this.path(language), JSON.stringify({ ref, keywords }));
        return keywords;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`Couldn't download the emoji keywords for ${language}`);
  }

  /** The languages saved with the current data version (what the picker searches in besides English) */
  async list(): Promise<EmojiSearchLanguage[]> {
    if (!(await this.deps.files.exists(this.dir))) return [];
    const languages = (await this.deps.files.list(this.dir))
      .map((path) => path.slice(path.lastIndexOf("/") + 1).replace(/\.json$/, ""))
      .filter((name): name is EmojiSearchLanguage => (EMOJI_SEARCH_LANGUAGES as readonly string[]).includes(name));
    const saved = await Promise.all(languages.map(async (language) => ((await this.load(language)) ? language : null)));
    return saved.filter((language): language is EmojiSearchLanguage => language !== null);
  }

  /** Delete the saved keywords (nothing happens if there are none) */
  async remove(language: string): Promise<void> {
    if (await this.deps.files.exists(this.path(language))) await this.deps.files.remove(this.path(language));
  }
}
