import { describe, expect, it } from "vitest";
import { d, md, mondayWeeks } from "@/test-fixtures";
import { nearestNote, notesWithFormat, periodOfNote } from "./notes-by-format";

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

describe("nearestNote（前）: その周期のノートのうち、ある日より前でいちばん近いもの（Open previous periodic note）", () => {
    it("すぐ前の日のノートがあれば、それ", () => {
        const files = [md("日記/2026-11-02.md"), md("日記/2026-11-03.md")];
        expect(nearestNote(files, "day", daily, mondayWeeks, d("2026-11-04"), "previous")?.path).toBe("日記/2026-11-03.md");
    });

    it("すぐ前の日のノートがなければ、さらに前でいちばん近いノート", () => {
        const files = [md("日記/2026-10-01.md"), md("日記/2026-10-30.md"), md("日記/2026-11-05.md")];
        expect(nearestNote(files, "day", daily, mondayWeeks, d("2026-11-04"), "previous")?.path).toBe("日記/2026-10-30.md");
    });

    it("前にノートがなければ null（その日やあとのノートは選ばない）", () => {
        const files = [md("日記/2026-11-04.md"), md("日記/2026-11-05.md")];
        expect(nearestNote(files, "day", daily, mondayWeeks, d("2026-11-04"), "previous")).toBeNull();
    });

    it("フォルダの外や書式に合わないノートは数えない", () => {
        const files = [md("日記/2026-10-01.md"), md("2026-11-03.md"), md("日記/2026-11-03 copy.md")];
        expect(nearestNote(files, "day", daily, mondayWeeks, d("2026-11-04"), "previous")?.path).toBe("日記/2026-10-01.md");
    });

    it("月次ノートは月で比べる（年をまたいでも）", () => {
        const monthly = { folder: "月", format: "YYYY-MM" };
        const files = [md("月/2025-11.md"), md("月/2026-08.md")];
        expect(nearestNote(files, "month", monthly, mondayWeeks, d("2026-11-01"), "previous")?.path).toBe("月/2026-08.md");
    });
});

describe("nearestNote（後）: その周期のノートのうち、ある日より後でいちばん近いもの（Open next periodic note）", () => {
    it("すぐ後の日のノートがなければ、さらに後でいちばん近いノート", () => {
        const files = [md("日記/2026-11-01.md"), md("日記/2026-11-04.md"), md("日記/2026-11-20.md")];
        expect(nearestNote(files, "day", daily, mondayWeeks, d("2026-11-02"), "next")?.path).toBe("日記/2026-11-04.md");
    });

    it("後にノートがなければ null（その日や前のノートは選ばない）", () => {
        const files = [md("日記/2026-11-01.md"), md("日記/2026-11-02.md")];
        expect(nearestNote(files, "day", daily, mondayWeeks, d("2026-11-02"), "next")).toBeNull();
    });

    it("週次ノートは週で比べる", () => {
        const weekly = { folder: "週", format: "GGGG-[W]WW" };
        const files = [md("週/2026-W44.md"), md("週/2026-W47.md"), md("週/2026-W50.md")];
        expect(nearestNote(files, "week", weekly, mondayWeeks, d("2026-11-02"), "next")?.path).toBe("週/2026-W47.md");
    });
});
