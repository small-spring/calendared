import { describe, expect, it } from "vitest";
import { weekSchemeFor } from "@/weeks";
import { isBackupPath, notesWithFormat } from "./notes-by-format";

const weeks = weekSchemeFor({ weekStartId: 1 });
const md = (path: string) => {
    const name = path.slice(path.lastIndexOf("/") + 1);
    const dot = name.lastIndexOf(".");
    return { path, basename: dot === -1 ? name : name.slice(0, dot), extension: dot === -1 ? "" : name.slice(dot + 1) };
};
const daily = { folder: "日記", format: "YYYY-MM-DD" };

describe("notesWithFormat: その周期のフォルダで、書式に名前が合うノートのパス", () => {
    it("書式がそのまま書く名前のノートを選ぶ", () => {
        const files = [md("日記/2026-10-30.md"), md("日記/メモ.md"), md("日記/2026-10-30 copy.md")];
        expect(notesWithFormat(files, "day", daily, weeks)).toEqual(["日記/2026-10-30.md"]);
    });

    it("フォルダの下のフォルダも探す", () => {
        expect(notesWithFormat([md("日記/2026/2026-10-30.md")], "day", daily, weeks)).toEqual(["日記/2026/2026-10-30.md"]);
    });

    it("フォルダの外のノートは選ばない（名前が同じで始まる別のフォルダも）", () => {
        const files = [md("2026-10-30.md"), md("日記帳/2026-10-30.md"), md("ほか/2026-10-30.md")];
        expect(notesWithFormat(files, "day", daily, weeks)).toEqual([]);
    });

    it("フォルダが / なら Vault 全体から探す", () => {
        const files = [md("2026-10-30.md"), md("どこか/2026-10-31.md")];
        expect(notesWithFormat(files, "day", { ...daily, folder: "/" }, weeks)).toEqual([
            "2026-10-30.md",
            "どこか/2026-10-31.md",
        ]);
    });

    it("フォルダの両端の / はあってもなくても同じ", () => {
        expect(notesWithFormat([md("日記/2026-10-30.md")], "day", { ...daily, folder: "/日記/" }, weeks)).toEqual([
            "日記/2026-10-30.md",
        ]);
    });

    it("Markdown のファイルだけを選ぶ", () => {
        expect(notesWithFormat([md("日記/2026-10-30.pdf")], "day", daily, weeks)).toEqual([]);
    });

    it("バックアップのフォルダの中は選ばない", () => {
        const files = [md("日記/periodic-notes-BACKUP-20250101120000/2026-10-30.md")];
        expect(notesWithFormat(files, "day", daily, weeks)).toEqual([]);
    });

    it("週次ノートは週の決め方で読む", () => {
        const weekly = { folder: "週", format: "GGGG-[W]WW" };
        expect(notesWithFormat([md("週/2026-W44.md"), md("週/2026-W4.md")], "week", weekly, weeks)).toEqual([
            "週/2026-W44.md",
        ]);
    });

    it("読めても、書式が書く名前と違えば選ばない（例: 月の名前の大文字・小文字）", () => {
        const monthly = { folder: "月", format: "YYYY-MMM" };
        expect(notesWithFormat([md("月/2026-Oct.md"), md("月/2026-oct.md")], "month", monthly, weeks)).toEqual([
            "月/2026-Oct.md",
        ]);
    });

    it("ほかの周期の名前は選ばない", () => {
        expect(notesWithFormat([md("日記/2026-10.md")], "day", daily, weeks)).toEqual([]);
    });
});

describe("isBackupPath: 元の版が作ったバックアップのフォルダ（periodic-notes-BACKUP-日時）の中か", () => {
    it("どこかの階層がバックアップのフォルダなら true", () => {
        expect(isBackupPath("periodic-notes-BACKUP-20250101120000/2026-10-30.md")).toBe(true);
        expect(isBackupPath("日記/periodic-notes-BACKUP-20250101120000/a/2026-10-30.md")).toBe(true);
    });

    it("日時が正しくなければ、ただのフォルダ", () => {
        expect(isBackupPath("periodic-notes-BACKUP-old/2026-10-30.md")).toBe(false);
        expect(isBackupPath("日記/2026-10-30.md")).toBe(false);
    });
});
