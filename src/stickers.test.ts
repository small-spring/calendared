import { describe, expect, it } from "vitest";
import { isReservedStickerProperty, stickerFrom, stickerProperty } from "./stickers";

const on = { stickersEnabled: true, stickerProperty: "sticker" };
const cacheWith = (frontmatter: Record<string, unknown>) => ({ frontmatter });

describe("stickerProperty: ステッカーを入れるプロパティの名前", () => {
    it("設定の名前を、前後の空白を取って使う", () => {
        expect(stickerProperty(" mood ")).toBe("mood");
    });

    it("設定が空なら sticker", () => {
        expect(stickerProperty("")).toBe("sticker");
        expect(stickerProperty("  ")).toBe("sticker");
        expect(stickerProperty(undefined)).toBe("sticker");
    });

    it("Obsidian が意味を持たせているプロパティ（tags など）は使わず sticker にする", () => {
        expect(stickerProperty("Tags")).toBe("sticker");
        expect(stickerProperty("aliases")).toBe("sticker");
    });
});

describe("isReservedStickerProperty", () => {
    it("大文字・小文字と前後の空白を区別しない", () => {
        expect(isReservedStickerProperty(" CSSClasses ")).toBe(true);
        expect(isReservedStickerProperty("mood")).toBe(false);
    });
});

describe("stickerFrom: ノートのメタデータからステッカーを読む", () => {
    it("ステッカーのプロパティの絵文字を返す", () => {
        expect(stickerFrom(cacheWith({ sticker: "👍" }), on)).toEqual({ emoji: "👍" });
    });

    it("前後の空白は取る", () => {
        expect(stickerFrom(cacheWith({ sticker: " 👍 " }), on)).toEqual({ emoji: "👍" });
    });

    it("設定のプロパティの名前で読む", () => {
        const settings = { stickersEnabled: true, stickerProperty: "mood" };
        expect(stickerFrom(cacheWith({ mood: "😀", sticker: "👍" }), settings)).toEqual({ emoji: "😀" });
    });

    it("ステッカーをオフにしていれば、プロパティがあっても null", () => {
        expect(stickerFrom(cacheWith({ sticker: "👍" }), { ...on, stickersEnabled: false })).toBeNull();
    });

    it("絵文字 1 つでない値（文字、絵文字 2 つ、数）は null", () => {
        expect(stickerFrom(cacheWith({ sticker: "good" }), on)).toBeNull();
        expect(stickerFrom(cacheWith({ sticker: "👍👍" }), on)).toBeNull();
        expect(stickerFrom(cacheWith({ sticker: 1 }), on)).toBeNull();
    });

    it("リストなら、絵文字 1 つの最初の項目を使う", () => {
        expect(stickerFrom(cacheWith({ sticker: ["good", "🎉", "👍"] }), on)).toEqual({ emoji: "🎉" });
    });

    it("プロパティやメタデータがなければ null", () => {
        expect(stickerFrom(cacheWith({}), on)).toBeNull();
        expect(stickerFrom({}, on)).toBeNull();
        expect(stickerFrom(null, on)).toBeNull();
    });
});
