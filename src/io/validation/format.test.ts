import { describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

// The check reads the other periods' formats from the settings store (for duplicates); give it a stand-in
vi.mock("@/app-service", () => ({ PluginService: { getPlugin: () => null } }));
vi.mock("@/settings", () => ({
    settingsStore: writable({
        periods: {
            day: { format: "YYYY-MM-DD" },
            week: { format: "GGGG-[W]WW" },
            month: { format: "YYYY-MM" },
            quarter: { format: "YYYY-[Q]Q" },
            year: { format: "YYYY" },
        },
        localeSettings: { weekStartId: 1 },
    }),
}));

const { validateFormat } = await import("./format");

describe("validateFormat: 書式の誤り（設定画面に出す文）", () => {
    it("周期を 1 つに決められる書式は、誤りなし（空文字）", () => {
        expect(validateFormat("YYYYMMDD", "day")).toBe("");
        expect(validateFormat("GGGG-[W]WW", "week")).toBe("");
        expect(validateFormat("YYYY年M月", "month")).toBe("");
    });

    it("空の書式は誤りにしない", () => {
        expect(validateFormat("", "day")).toBe("");
    });

    it("ファイル名に使えない文字は誤り", () => {
        expect(validateFormat("YYYY:MM:DD", "day")).toBe("Format contains illegal characters");
    });

    it("周期に要る文字がなければ誤り", () => {
        expect(validateFormat("YYYY-MM", "day")).toMatch(/^Ambiguous format\. Missing day \(D\) info/);
        expect(validateFormat("MM", "month")).toMatch(/^Ambiguous format\. Missing year/);
    });

    it("ほかの周期の書式は、記号の決まりで誤りになる（同じ名前のノートを 2 つの周期が取り合わない）", () => {
        expect(validateFormat("YYYY-MM", "year")).toMatch(/^MM can't be used in yearly note names/);
    });

    it("その周期をまるごと含む周期の記号しか使えない（docs/adr/0040）", () => {
        expect(validateFormat("GGGG-[W]WW-DD", "week")).toBe("DD can't be used in weekly note names. Use the week-based year (GGGG) and week (WW).");
        expect(validateFormat("YYYY-[W]WW", "week")).toMatch(/^YYYY can't be used in weekly note names/);
        expect(validateFormat("YYYY-[Q]Q MMM", "quarter")).toMatch(/^MMM can't be used in quarterly note names/);
        expect(validateFormat("YYYY[年度]", "year")).toBe("");
    });

    it("その周期の今の書式と同じ値は誤りにしない（周期の書式は 1 つ）", () => {
        expect(validateFormat("YYYY-MM", "month")).toBe("");
    });
});
