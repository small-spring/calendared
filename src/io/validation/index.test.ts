import { describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import { md } from "@/test-fixtures";

// The parser reads the formats from the settings store; give it a stand-in with the formats used in the vault
// (and for the plugin service it imports, which needs a running Obsidian)
vi.mock("@/app-service", () => ({ PluginService: { getPlugin: () => null } }));
vi.mock("@/settings", async () => {
    const { settingsModule, testSettings } = await import("@/test-fixtures");
    return settingsModule(testSettings({ week: { format: "YYYY-[W]ww" } }));
});

const { isValidPeriodicNote, periodicNoteOf } = await import("./index");
const { settingsStore } = await import("@/settings");

// a note named fileName at the vault's top
const note = (fileName: string) => md(`${fileName}.md`);
const parse = (fileName: string) => {
    const { isValid, granularity, date } = isValidPeriodicNote(note(fileName));
    return { isValid, granularity, date: date?.format("YYYY-MM-DD") ?? null };
};

describe("isValidPeriodicNote: ファイル名から周期と日付を読む", () => {
    it("各周期の形式に合う名前を、その周期のノートとして読む", () => {
        expect(parse("2026-10-29")).toEqual({ isValid: true, granularity: "day", date: "2026-10-29" });
        expect(parse("2026-10")).toEqual({ isValid: true, granularity: "month", date: "2026-10-01" });
        expect(parse("2026-Q4")).toEqual({ isValid: true, granularity: "quarter", date: "2026-10-01" });
        expect(parse("2026")).toEqual({ isValid: true, granularity: "year", date: "2026-01-01" });
    });

    it("形式に完全に一致しない名前は周期ノートではない", () => {
        const notPeriodic = { isValid: null, granularity: null, date: null };
        expect(parse("メモ")).toEqual(notPeriodic);
        expect(parse("2026-10-29 copy")).toEqual(notPeriodic);
        expect(parse("2026-13")).toEqual(notPeriodic); // no 13th month
        expect(parse("2026-1-5")).toEqual(notPeriodic); // not zero-padded
    });

    it("週次ノートの日付は、その週（カレンダーの行）の最初の日。今日が何曜日でも同じ", () => {
        // fixed 2026-10-29: the parser used to take today and swap in the year and week number (docs/code/periods.md)
        // isValid is false: YYYY can't be used in a weekly note's format any more (docs/adr/0040), but the note is still read
        vi.useFakeTimers({ now: new Date(2026, 9, 29) }); // a Thursday
        expect(parse("2026-W44")).toEqual({ isValid: false, granularity: "week", date: "2026-10-26" });

        vi.useFakeTimers({ now: new Date(2026, 10, 2) }); // a Monday
        expect(parse("2026-W44")).toEqual({ isValid: false, granularity: "week", date: "2026-10-26" });
    });

    it("【気になる点】YYYY と ww を混ぜた週の書式は、年をまたぐ週の名前を読めない（書式を GGGG-[W]WW にすれば読める）", () => {
        // week 1 of 2026 starts Mon 2025-12-29, and YYYY writes its Monday's calendar year: "2025-W01".
        // But moment reads "2025-W01" as week 1 of 2025, so the name doesn't round-trip. Neither name is read as a weekly note
        expect(parse("2025-W01").isValid).toBeNull();
        expect(parse("2026-W01").isValid).toBeNull();
    });

    it("周期の名前（period）も返す", () => {
        expect(isValidPeriodicNote(note("2026-W44")).period).toEqual({ granularity: "week", weekYear: 2026, week: 44 });
        expect(isValidPeriodicNote(note("2026-10")).period).toEqual({ granularity: "month", year: 2026, month: 10 });
        expect(isValidPeriodicNote(note("メモ")).period).toBeNull();
    });
});

describe("isValidPeriodicNote: 周期の書式は 1 つ（ADR-0019）", () => {
    it("周期の書式に合う名前だけを読む。前の書式の名前は読まない", () => {
        expect(parse("20261029")).toEqual({ isValid: null, granularity: null, date: null });
        expect(isValidPeriodicNote(note("2026-10-29")).format).toBe("YYYY-MM-DD");
    });

    it("書式に誤りがあれば（その周期で使えない記号があるなど）、名前は読めても isValid が false", () => {
        const saved = get(settingsStore);
        settingsStore.set({ ...saved, periods: { ...saved.periods, month: { ...saved.periods.month, format: "YY-MM-DD" } } });
        try {
            expect(parse("26-10-01")).toEqual({ isValid: false, granularity: "month", date: "2026-10-01" });
        } finally {
            settingsStore.set(saved);
        }
    });
});

describe("isValidPeriodicNote: 周期ノートは、その周期のフォルダ（とその下）の Markdown だけ（件数・移行と同じ決まり）", () => {
    // the rule itself (folders under it, a folder of /, Markdown only) is tested in notes-by-format.test.ts

    it("設定のフォルダとその下のノートを読み、外のノートは名前が合っても周期ノートではない", () => {
        const saved = get(settingsStore);
        settingsStore.set({ ...saved, periods: { ...saved.periods, day: { ...saved.periods.day, folder: "日記" } } });
        try {
            expect(isValidPeriodicNote(md("日記/2026-10-29.md")).granularity).toBe("day");
            expect(isValidPeriodicNote(md("日記/2026/2026-10-29.md")).granularity).toBe("day");
            expect(isValidPeriodicNote(md("2026-10-29.md")).isValid).toBeNull();
            expect(isValidPeriodicNote(md("メモ/2026-10-29.md")).isValid).toBeNull();
        } finally {
            settingsStore.set(saved);
        }
    });
});

describe("periodicNoteOf: 周期ノートなら周期と日付、でなければ null", () => {
    it("周期ノートなら、isValidPeriodicNote と同じ周期・日付・期間・書式", () => {
        const note_ = periodicNoteOf(note("2026-10-29"));
        expect(note_?.granularity).toBe("day");
        expect(note_?.date.format("YYYY-MM-DD")).toBe("2026-10-29");
        expect(note_?.period).toEqual(isValidPeriodicNote(note("2026-10-29")).period);
        expect(note_?.format).toBe("YYYY-MM-DD");
    });

    it("書式に誤りがあっても、名前が読めれば周期ノート（isValid が false）", () => {
        const saved = get(settingsStore);
        settingsStore.set({ ...saved, periods: { ...saved.periods, month: { ...saved.periods.month, format: "YY-MM-DD" } } });
        try {
            expect(periodicNoteOf(note("26-10-01"))?.isValid).toBe(false);
        } finally {
            settingsStore.set(saved);
        }
    });

    it("周期ノートでなければ null", () => {
        expect(periodicNoteOf(note("メモ"))).toBeNull();
        expect(periodicNoteOf(md("2026-10-29.pdf"))).toBeNull();
    });
});
