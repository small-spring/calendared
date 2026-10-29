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

    it("【気になる点】週次ノートの日付は週の始まりではなく、今日と同じ曜日になる", () => {
        // the parser takes today and swaps in the note's year and week number
        vi.useFakeTimers({ now: new Date(2026, 9, 29) }); // a Thursday
        expect(parse("2026-W44")).toEqual({ isValid: true, granularity: "week", date: "2026-10-29" });

        vi.useFakeTimers({ now: new Date(2026, 10, 2) }); // a Monday
        expect(parse("2026-W44")).toEqual({ isValid: true, granularity: "week", date: "2026-10-26" });
    });
});
