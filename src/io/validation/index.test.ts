import { describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

// The parser reads the formats from the settings store; give it a stand-in with the formats used in the vault
// (and for the plugin service it imports, which needs a running Obsidian)
vi.mock("@/app-service", () => ({ PluginService: { getPlugin: () => null } }));
vi.mock("@/settings", () => {
    const format = (id: string, value: string, error = "") => ({ [id]: { id, value, error, loading: false } });
    return {
        settingsStore: writable({
            periods: {
                day: { formats: format("d", "YYYY-MM-DD") },
                week: { formats: format("w", "YYYY-[W]ww") },
                month: { formats: format("m", "YYYY-MM") },
                quarter: { formats: format("q", "YYYY-[Q]Q") },
                year: { formats: format("y", "YYYY") },
            },
            localeSettings: { weekStartId: 1 },
        }),
    };
});

const { isValidPeriodicNote } = await import("./index");

const parse = (fileName: string) => {
    const { isValid, granularity, date } = isValidPeriodicNote(fileName);
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
        // fixed 2026-10-29: the parser used to take today and swap in the year and week number (docs/periods.md)
        vi.useFakeTimers({ now: new Date(2026, 9, 29) }); // a Thursday
        expect(parse("2026-W44")).toEqual({ isValid: true, granularity: "week", date: "2026-10-26" });

        vi.useFakeTimers({ now: new Date(2026, 10, 2) }); // a Monday
        expect(parse("2026-W44")).toEqual({ isValid: true, granularity: "week", date: "2026-10-26" });
    });

    it("【気になる点】YYYY と ww を混ぜた週の書式は、年をまたぐ週の名前を読めない（書式を GGGG-[W]WW にすれば読める）", () => {
        // week 1 of 2026 starts Mon 2025-12-29, and YYYY writes its Monday's calendar year: "2025-W01".
        // But moment reads "2025-W01" as week 1 of 2025, so the name doesn't round-trip. Neither name is read as a weekly note
        expect(parse("2025-W01").isValid).toBeNull();
        expect(parse("2026-W01").isValid).toBeNull();
    });

    it("周期の名前（period）も返す", () => {
        expect(isValidPeriodicNote("2026-W44").period).toEqual({ granularity: "week", weekYear: 2026, week: 44 });
        expect(isValidPeriodicNote("2026-10").period).toEqual({ granularity: "month", year: 2026, month: 10 });
        expect(isValidPeriodicNote("メモ").period).toBeNull();
    });
});
