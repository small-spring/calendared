import { describe, expect, it } from "vitest";
import { d, mondayWeeks, sundayWeeks } from "@/test-fixtures";
import { noteNameOf, notePath, templateFilePath } from "./note-path";

// notePath gets everything it depends on as arguments (no settings store, no Obsidian), so a caller that reads the
// settings reactively recomputes the path whenever they change (docs/adr/0016)


describe("notePath: 周期・日付・フォルダ・書式・週の決め方から、ノートのパスを作る", () => {
    it("フォルダの下に、書式で作った名前 + .md を置く", () => {
        expect(notePath("day", d("2026-10-30"), { folder: "日記", format: "YYYY-MM-DD" }, mondayWeeks)).toBe(
            "日記/2026-10-30.md",
        );
    });

    it("フォルダが / ならフォルダなし、最後の / はあってもなくても同じ", () => {
        expect(notePath("month", d("2026-10-30"), { folder: "/", format: "YYYY-MM" }, mondayWeeks)).toBe("2026-10.md");
        expect(notePath("month", d("2026-10-30"), { folder: "月/", format: "YYYY-MM" }, mondayWeeks)).toBe(
            "月/2026-10.md",
        );
    });

    it("書式に .md が含まれていれば、もう一度は足さない", () => {
        expect(notePath("day", d("2026-10-30"), { folder: "/", format: "YYYY-MM-DD[.md]" }, mondayWeeks)).toBe(
            "2026-10-30.md",
        );
    });

    it("書式に / があれば、フォルダの下のフォルダになる", () => {
        expect(notePath("day", d("2026-10-30"), { folder: "日記", format: "YYYY/MM/YYYY-MM-DD" }, mondayWeeks)).toBe(
            "日記/2026/10/2026-10-30.md",
        );
    });

    it("週次ノートは、渡した週の決め方で日付を含む週を決める", () => {
        // 2026-11-01 is a Sunday: the last day of a Monday-first week, the first day of a Sunday-first one
        const week = { folder: "/", format: "GGGG-[W]WW" };
        expect(notePath("week", d("2026-11-01"), week, mondayWeeks)).toBe("2026-W44.md");
        expect(notePath("week", d("2026-11-01"), week, sundayWeeks)).toBe("2026-W45.md");
    });
});

describe("templateFilePath: 設定のテンプレートの欄から、テンプレートのファイルのパスを作る", () => {
    it(".md は補わない。書かれたファイルのパスそのもの", () => {
        expect(templateFilePath("テンプレート/日")).toBe("テンプレート/日");
        expect(templateFilePath("テンプレート/日.md")).toBe("テンプレート/日.md");
    });

    it("前後の空白を除き、パスの形をそろえる", () => {
        expect(templateFilePath("  テンプレート//日.md ")).toBe("テンプレート/日.md");
        expect(templateFilePath("/テンプレート/日.md")).toBe("テンプレート/日.md");
    });

    it("空や Vault の一番上だけなら、テンプレートなし（空）", () => {
        expect(templateFilePath("")).toBe("");
        expect(templateFilePath("  ")).toBe("");
        expect(templateFilePath("/")).toBe("");
    });
});

describe("noteNameOf: パスからノートの名前（フォルダと .md を除く）", () => {
    it("フォルダと .md を除く", () => {
        expect(noteNameOf("日記/2026/2026-10-30.md")).toBe("2026-10-30");
        expect(noteNameOf("2026-10.md")).toBe("2026-10");
    });

    it(".md でなければ拡張子はそのまま", () => {
        expect(noteNameOf("添付/絵.png")).toBe("絵.png");
    });
});
