import { readdirSync, readFileSync } from "fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
    EMOJI_DATA_SIZES_KB,
    EMOJI_SEARCH_LANGUAGES,
    EmojiKeywordStore,
    emojiDataUrls,
    emojiSearchLanguage,
    mergeKeywords,
    parseKeywords,
} from "./emoji-search";

// Searching the sticker picker in your own language: the keywords are downloaded once on request and kept in the
// plugin's folder (docs/publishing.md 3., data/emoji-keywords/README.md). Obsidian's file system and network are
// stand-ins here.

describe("emojiSearchLanguage: Obsidian の表示言語から、検索の言葉のファイルの言語を決める", () => {
    it("ファイルがある言語はそのまま", () => {
        expect(emojiSearchLanguage("ja")).toBe("ja");
        expect(emojiSearchLanguage("de")).toBe("de");
    });

    it("地域付きの言語は、言語の部分で探す（大文字・小文字は区別しない）", () => {
        expect(emojiSearchLanguage("pt-BR")).toBe("pt");
        expect(emojiSearchLanguage("fi-FI")).toBe("fi");
    });

    it("繁体字の中国語は、簡体字のファイル（zh）で代えない", () => {
        expect(emojiSearchLanguage("zh")).toBe("zh");
        expect(emojiSearchLanguage("zh-TW")).toBeNull();
    });

    it("英語は要らない（もともと英語で検索できる）、ファイルのない言語は null", () => {
        expect(emojiSearchLanguage("en")).toBeNull();
        expect(emojiSearchLanguage("en-GB")).toBeNull();
        expect(emojiSearchLanguage("sv")).toBeNull();
    });

    it("対応する言語は data/emoji-keywords/ のファイルと同じ", () => {
        const files = readdirSync("data/emoji-keywords")
            .filter((f) => f.endsWith(".json"))
            .map((f) => f.slice(0, -5));
        expect([...EMOJI_SEARCH_LANGUAGES].sort()).toEqual(files.sort());
    });
});

describe("EMOJI_DATA_SIZES_KB: 言語ごとのファイルの大きさ（ダウンロードの前に見せる）", () => {
    it("data/emoji-keywords/ の実際の大きさ（KB、切り上げ）と同じ", () => {
        for (const language of EMOJI_SEARCH_LANGUAGES) {
            const bytes = readFileSync(`data/emoji-keywords/${language}.json`).length;
            expect(EMOJI_DATA_SIZES_KB[language], language).toBe(Math.ceil(bytes / 1024));
        }
    });
});

describe("emojiDataUrls: ダウンロードする先（先に jsDelivr、だめなら GitHub）", () => {
    it("コミットを指定した jsDelivr と GitHub の raw の URL", () => {
        expect(emojiDataUrls("ja", "abc123")).toEqual([
            "https://cdn.jsdelivr.net/gh/small-spring/calendared@abc123/data/emoji-keywords/ja.json",
            "https://raw.githubusercontent.com/small-spring/calendared/abc123/data/emoji-keywords/ja.json",
        ]);
    });

    it("置き場所を差し替えれば（開発用）、そこだけから取る", () => {
        expect(emojiDataUrls("ja", "abc123", "http://localhost:8765/")).toEqual([
            "http://localhost:8765/data/emoji-keywords/ja.json",
        ]);
    });
});

describe("parseKeywords: ダウンロードした中身を確かめる", () => {
    it("絵文字の id から言葉の一覧への対応なら、その中身", () => {
        expect(parseKeywords('{"+1":["いいね","親指"],"smile":["笑顔"]}')).toEqual({
            "+1": ["いいね", "親指"],
            smile: ["笑顔"],
        });
    });

    it("JSON でない、形が違う（配列、文字でない言葉、空）なら null", () => {
        expect(parseKeywords("<html>Not Found</html>")).toBeNull();
        expect(parseKeywords("[]")).toBeNull();
        expect(parseKeywords('{"+1":"いいね"}')).toBeNull();
        expect(parseKeywords('{"+1":[1]}')).toBeNull();
        expect(parseKeywords("{}")).toBeNull();
    });
});

describe("mergeKeywords: emoji-mart のデータに言葉を足す", () => {
    const data = {
        emojis: { "+1": { id: "+1", keywords: ["thumbsup"] }, smile: { id: "smile", keywords: ["happy"] } },
        other: 1,
    };

    it("英語の言葉の後ろに足す。言葉のない絵文字はそのまま", () => {
        const merged = mergeKeywords(data, { "+1": ["いいね"] });
        expect(merged.emojis["+1"].keywords).toEqual(["thumbsup", "いいね"]);
        expect(merged.emojis.smile.keywords).toEqual(["happy"]);
        expect(merged.other).toBe(1);
    });

    it("元のデータは変えない", () => {
        mergeKeywords(data, { "+1": ["いいね"] });
        expect(data.emojis["+1"].keywords).toEqual(["thumbsup"]);
    });
});

describe("EmojiKeywordStore: ダウンロードして、プラグインのフォルダに保存する", () => {
    let files: Map<string, string>;
    let requests: string[];
    let responses: Map<string, string | Error>;
    const keywords = { "+1": ["いいね"] };

    const store = (ref = "r1", urls = (language: string) => [`https://a/${language}`, `https://b/${language}`]) =>
        new EmojiKeywordStore({
            folder: "plugin-folder",
            ref,
            urls,
            files: {
                exists: async (path) => files.has(path) || [...files.keys()].some((f) => f.startsWith(`${path}/`)),
                read: async (path) => files.get(path)!,
                write: async (path, text) => void files.set(path, text),
                // like Obsidian's adapter, removing a file that isn't there fails
                remove: async (path) => {
                    if (!files.delete(path)) throw new Error(`ENOENT: ${path}`);
                },
                mkdir: async () => undefined,
                list: async (dir) => [...files.keys()].filter((f) => f.startsWith(`${dir}/`)),
            },
            request: async (url) => {
                requests.push(url);
                const response = responses.get(url);
                if (response instanceof Error || response === undefined) throw response ?? new Error("404");
                return response;
            },
        });

    beforeEach(() => {
        files = new Map();
        requests = [];
        responses = new Map([["https://a/ja", JSON.stringify(keywords)]]);
    });

    it("ダウンロードして、プラグインのフォルダの emoji-keywords/ に、どの版かと一緒に保存する", async () => {
        expect(await store().download("ja")).toEqual(keywords);
        const saved = JSON.parse(files.get("plugin-folder/emoji-keywords/ja.json")!) as unknown;
        expect(saved).toEqual({ ref: "r1", keywords });
    });

    it("保存したものは、通信せずに読める（オフ → オンでも落とし直さない）", async () => {
        await store().download("ja");
        requests = [];
        expect(await store().load("ja")).toEqual(keywords);
        expect(requests).toEqual([]);
    });

    it("保存していなければ load は null", async () => {
        expect(await store().load("ja")).toBeNull();
    });

    it("データの版が変わっていれば、保存したものは使わない（落とし直しが要る）", async () => {
        await store("r1").download("ja");
        expect(await store("r2").load("ja")).toBeNull();
    });

    it("保存したファイルが壊れていれば null", async () => {
        files.set("plugin-folder/emoji-keywords/ja.json", "{broken");
        expect(await store().load("ja")).toBeNull();
    });

    it("最初の先から取れなければ、次の先から取る", async () => {
        responses = new Map([["https://b/ja", JSON.stringify(keywords)]]);
        expect(await store().download("ja")).toEqual(keywords);
        expect(requests).toEqual(["https://a/ja", "https://b/ja"]);
    });

    it("中身がおかしければ、次の先を試す", async () => {
        responses = new Map([
            ["https://a/ja", "<html>error</html>"],
            ["https://b/ja", JSON.stringify(keywords)],
        ]);
        expect(await store().download("ja")).toEqual(keywords);
    });

    it("どこからも取れなければエラーにし、何も保存しない", async () => {
        responses = new Map();
        await expect(store().download("ja")).rejects.toThrow();
        expect(files.size).toBe(0);
    });

    it("list: 今のデータの版で保存してある言語の一覧", async () => {
        responses.set("https://a/zh", JSON.stringify({ "+1": ["赞"] }));
        await store().download("ja");
        await store().download("zh");
        expect((await store().list()).sort()).toEqual(["ja", "zh"]);
    });

    it("list: 版の違うものや壊れたもの、知らない名前のファイルは入れない", async () => {
        await store("r1").download("ja");
        files.set("plugin-folder/emoji-keywords/zh.json", "{broken");
        files.set("plugin-folder/emoji-keywords/notes.txt", "x");
        files.set("plugin-folder/emoji-keywords/sv.json", JSON.stringify({ ref: "r1", keywords }));
        expect(await store("r2").list()).toEqual([]);
        expect(await store("r1").list()).toEqual(["ja"]);
    });

    it("list: 何も保存していなければ空", async () => {
        expect(await store().list()).toEqual([]);
    });

    it("remove で保存したものを消す", async () => {
        await store().download("ja");
        await store().remove("ja");
        expect(await store().load("ja")).toBeNull();
    });

    it("保存していないものを remove しても困らない", async () => {
        await expect(store().remove("ja")).resolves.toBeUndefined();
    });
});
