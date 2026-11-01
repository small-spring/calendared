import { describe, expect, it } from "vitest";
import { md, mondayWeeks } from "@/test-fixtures";
import { notesWithFormat, periodOfNote } from "./notes-by-format";

const daily = { folder: "日記", format: "YYYY-MM-DD" };

describe("notesWithFormat: その周期のフォルダで、書式に名前が合うノートのパス", () => {
    it("書式がそのまま書く名前のノートを選ぶ", () => {
        const files = [md("日記/2026-10-30.md"), md("日記/メモ.md"), md("日記/2026-10-30 copy.md")];
        expect(notesWithFormat(files, "day", daily, mondayWeeks)).toEqual(["日記/2026-10-30.md"]);
    });

    it("フォルダの下のフォルダも探す", () => {
        expect(notesWithFormat([md("日記/2026/2026-10-30.md")], "day", daily, mondayWeeks)).toEqual(["日記/2026/2026-10-30.md"]);
    });

    it("フォルダの外のノートは選ばない（名前が同じで始まる別のフォルダも）", () => {
        const files = [md("2026-10-30.md"), md("日記帳/2026-10-30.md"), md("ほか/2026-10-30.md")];
        expect(notesWithFormat(files, "day", daily, mondayWeeks)).toEqual([]);
    });

    it("フォルダが / なら Vault 全体から探す", () => {
        const files = [md("2026-10-30.md"), md("どこか/2026-10-31.md")];
        expect(notesWithFormat(files, "day", { ...daily, folder: "/" }, mondayWeeks)).toEqual([
            "2026-10-30.md",
            "どこか/2026-10-31.md",
        ]);
    });

    it("フォルダの両端の / はあってもなくても同じ", () => {
        expect(notesWithFormat([md("日記/2026-10-30.md")], "day", { ...daily, folder: "/日記/" }, mondayWeeks)).toEqual([
            "日記/2026-10-30.md",
        ]);
    });

    it("Markdown のファイルだけを選ぶ", () => {
        expect(notesWithFormat([md("日記/2026-10-30.pdf")], "day", daily, mondayWeeks)).toEqual([]);
    });

    it("週次ノートは週の決め方で読む", () => {
        const weekly = { folder: "週", format: "GGGG-[W]WW" };
        expect(notesWithFormat([md("週/2026-W44.md"), md("週/2026-W4.md")], "week", weekly, mondayWeeks)).toEqual([
            "週/2026-W44.md",
        ]);
    });

    it("読めても、書式が書く名前と違えば選ばない（例: 月の名前の大文字・小文字）", () => {
        const monthly = { folder: "月", format: "YYYY-MMM" };
        expect(notesWithFormat([md("月/2026-Oct.md"), md("月/2026-oct.md")], "month", monthly, mondayWeeks)).toEqual([
            "月/2026-Oct.md",
        ]);
    });

    it("ほかの周期の名前は選ばない", () => {
        expect(notesWithFormat([md("日記/2026-10.md")], "day", daily, mondayWeeks)).toEqual([]);
    });
});

describe("periodOfNote: その周期のフォルダにあり、書式どおりの名前のノートなら、その期間", () => {
    it("フォルダの中（下のフォルダも）で書式どおりの名前なら、その期間", () => {
        expect(periodOfNote(md("日記/2026-10-30.md"), "day", daily, mondayWeeks)).toEqual(
            periodOfNote(md("日記/2026/2026-10-30.md"), "day", daily, mondayWeeks),
        );
        expect(periodOfNote(md("日記/2026-10-30.md"), "day", daily, mondayWeeks)).not.toBeNull();
    });

    it("フォルダの外、Markdown でない、書式どおりでない名前なら null", () => {
        expect(periodOfNote(md("メモ/2026-10-30.md"), "day", daily, mondayWeeks)).toBeNull();
        expect(periodOfNote(md("日記/2026-10-30.pdf"), "day", daily, mondayWeeks)).toBeNull();
        expect(periodOfNote(md("日記/2026-10-3.md"), "day", daily, mondayWeeks)).toBeNull();
    });
});
