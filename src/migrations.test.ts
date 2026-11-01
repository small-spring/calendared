import { describe, expect, it } from "vitest";
import { periodRules } from "@/periods";
import { weekSchemeFor } from "@/weeks";
import { moveSticker, planFormatRenames, planStickerMoves } from "./migrations";

const weeks = periodRules(weekSchemeFor({ weekStartId: 1 }));
const md = (path: string) => {
    const name = path.slice(path.lastIndexOf("/") + 1);
    const dot = name.lastIndexOf(".");
    return { path, basename: dot === -1 ? name : name.slice(0, dot), extension: dot === -1 ? "" : name.slice(dot + 1) };
};
const daily = { folder: "日記", fromFormat: "YYYYMMDD", toFormat: "YYYY-MM-DD" };

describe("planFormatRenames: 書式の変換で、どのノートをどの名前に変えるか（ADR-0023・0024）", () => {
    it("前の書式で読めるノートを、同じフォルダの中で新しい書式の名前にする", () => {
        expect(planFormatRenames([md("日記/20261030.md"), md("日記/2026/20261031.md")], "day", daily, weeks)).toEqual([
            { from: "日記/20261030.md", to: "日記/2026-10-30.md", conflict: false },
            { from: "日記/2026/20261031.md", to: "日記/2026/2026-10-31.md", conflict: false },
        ]);
    });

    it("前の書式で読めないノートと、周期のフォルダの外のノートは対象にしない", () => {
        expect(planFormatRenames([md("日記/メモ.md"), md("日記/2026-10-30.md"), md("ほか/20261030.md")], "day", daily, weeks)).toEqual([]);
    });

    it("新しい名前のファイルがもうあれば、ぶつかったとして印を付ける（上書きしない）", () => {
        expect(planFormatRenames([md("日記/20261030.md"), md("日記/2026-10-30.md")], "day", daily, weeks)).toEqual([
            { from: "日記/20261030.md", to: "日記/2026-10-30.md", conflict: true },
        ]);
    });

    it("大文字・小文字だけが違う名前もぶつかったとみなす（macOS などでは同じファイルになる）", () => {
        const monthly = { folder: "/", fromFormat: "YYYYMMM", toFormat: "YYYY-MMM" };
        expect(planFormatRenames([md("2026Oct.md"), md("2026-oct.md")], "month", monthly, weeks)).toEqual([
            { from: "2026Oct.md", to: "2026-Oct.md", conflict: true },
        ]);
    });

    it("大文字・小文字だけ違う名前に変えるとき、ノート自身とはぶつからない", () => {
        const weekly = { folder: "/", fromFormat: "GGGG-[w]WW", toFormat: "GGGG-[W]WW" };
        expect(planFormatRenames([md("2026-w44.md")], "week", weekly, weeks)).toEqual([
            { from: "2026-w44.md", to: "2026-W44.md", conflict: false },
        ]);
    });

    it("大文字・小文字だけ違う名前に変えるとき、その名前のファイルがほかにあればぶつかる（大文字・小文字を区別する Linux など）", () => {
        const weekly = { folder: "/", fromFormat: "GGGG-[w]WW", toFormat: "GGGG-[W]WW" };
        expect(planFormatRenames([md("2026-w44.md"), md("2026-W44.md")], "week", weekly, weeks)).toEqual([
            { from: "2026-w44.md", to: "2026-W44.md", conflict: true },
        ]);
    });

    it("変えた先の名前が、ほかに変えるノートの今の名前と同じなら、ぶつかったとみなす（変える順で結果が変わらないように）", () => {
        const swapped = { folder: "/", fromFormat: "YYYY-MM-DD", toFormat: "YYYY-DD-MM" };
        expect(planFormatRenames([md("2026-10-03.md"), md("2026-03-10.md")], "day", swapped, weeks)).toEqual([
            { from: "2026-10-03.md", to: "2026-03-10.md", conflict: true },
            { from: "2026-03-10.md", to: "2026-10-03.md", conflict: true },
        ]);
    });

    it("前の書式と新しい書式が同じなら、何も変えない", () => {
        expect(planFormatRenames([md("日記/2026-10-30.md")], "day", { ...daily, fromFormat: "YYYY-MM-DD" }, weeks)).toEqual([]);
    });

    it("週次ノートは週の決め方で読み、書く", () => {
        const weekly = { folder: "/", fromFormat: "GGGG[W]WW", toFormat: "GGGG-[W]WW" };
        expect(planFormatRenames([md("2026W44.md"), md("2026W4.md")], "week", weekly, weeks)).toEqual([
            { from: "2026W44.md", to: "2026-W44.md", conflict: false },
        ]);
    });
});

const note = (path: string, frontmatter?: Record<string, unknown>) => ({ path, frontmatter });

describe("planStickerMoves: ステッカーのプロパティの付け替えで、どのノートの値をどう移すか（ADR-0023）", () => {
    it("前のプロパティを持つノートの値を、今のプロパティへ移す", () => {
        expect(planStickerMoves([note("a.md", { mood: "😀" }), note("b.md", { tags: ["x"] }), note("c.md")], "mood", "sticker")).toEqual([
            { path: "a.md", value: "😀", conflict: false },
        ]);
    });

    it("今のプロパティがもうあるノートは、ぶつかったとして印を付ける（値が空でも）", () => {
        expect(planStickerMoves([note("a.md", { mood: "😀", sticker: "🎉" }), note("b.md", { mood: "😀", sticker: null })], "mood", "sticker")).toEqual([
            { path: "a.md", value: "😀", conflict: true },
            { path: "b.md", value: "😀", conflict: true },
        ]);
    });

    it("前のプロパティが空でも、プロパティごと移す", () => {
        expect(planStickerMoves([note("a.md", { mood: null })], "mood", "sticker")).toEqual([{ path: "a.md", value: null, conflict: false }]);
    });

    it("前と今のプロパティが同じなら、何も移さない", () => {
        expect(planStickerMoves([note("a.md", { sticker: "😀" })], "sticker", "sticker")).toEqual([]);
    });
});

describe("moveSticker: ノートのプロパティの中で、前のプロパティの値を今のプロパティへ移す（processFrontMatter の中で使う）", () => {
    it("値を今のプロパティに入れ、前のプロパティを消す。ほかのプロパティはそのまま", () => {
        const frontmatter: Record<string, unknown> = { tags: ["x"], mood: "😀" };
        expect(moveSticker(frontmatter, "mood", "sticker")).toBe(true);
        expect(frontmatter).toEqual({ tags: ["x"], sticker: "😀" });
    });

    it("今のプロパティがもうあれば、何も変えない", () => {
        const frontmatter: Record<string, unknown> = { mood: "😀", sticker: "🎉" };
        expect(moveSticker(frontmatter, "mood", "sticker")).toBe(false);
        expect(frontmatter).toEqual({ mood: "😀", sticker: "🎉" });
    });

    it("前のプロパティがなければ、何も変えない（一覧を見たあとに変わっていたとき）", () => {
        const frontmatter: Record<string, unknown> = { tags: ["x"] };
        expect(moveSticker(frontmatter, "mood", "sticker")).toBe(false);
        expect(frontmatter).toEqual({ tags: ["x"] });
    });
});
