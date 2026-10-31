import { describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

// The check reads the other periods' formats from the settings store (for duplicates); give it a stand-in
vi.mock("@/app-service", () => ({ PluginService: { getPlugin: () => null } }));
vi.mock("@/settings", () => {
    const format = (id: string, value: string) => ({ [id]: { id, value, error: "", loading: false } });
    return {
        settingsStore: writable({
            periods: {
                day: { formats: format("d", "YYYY-MM-DD") },
                week: { formats: format("w", "GGGG-[W]WW") },
                month: { formats: format("m", "YYYY-MM") },
                quarter: { formats: format("q", "YYYY-[Q]Q") },
                year: { formats: format("y", "YYYY") },
            },
            localeSettings: { weekStartId: 1 },
        }),
    };
});

const { validateFormat } = await import("./format");

describe("validateFormat: 書式の誤り（設定画面に出す文）", () => {
    it("周期を 1 つに決められる書式は、誤りなし（空文字）", () => {
        expect(validateFormat("YYYYMMDD", "day", "new")).toBe("");
        expect(validateFormat("GGGG-[W]WW", "week", "w")).toBe("");
        expect(validateFormat("YYYY年M月", "month", "new")).toBe("");
    });

    it("空の書式は誤りにしない", () => {
        expect(validateFormat("", "day", "new")).toBe("");
    });

    it("ファイル名に使えない文字は誤り", () => {
        expect(validateFormat("YYYY:MM:DD", "day", "new")).toBe("Format contains illegal characters");
    });

    it("周期に要る文字がなければ誤り", () => {
        expect(validateFormat("YYYY-MM", "day", "new")).toMatch(/^Ambiguous format\. Missing day \(D\) info/);
        expect(validateFormat("MM", "month", "new")).toMatch(/^Ambiguous format\. Missing year/);
    });

    it("ほかの周期と同じ書式は誤り（同じ名前のノートを 2 つの周期が取り合う）", () => {
        expect(validateFormat("YYYY-MM", "year", "new")).toBe("Duplicate format from Monthly Notes settings");
    });

    it("同じ周期のほかの書式と同じ値も誤り（作り直す前の振る舞い）", () => {
        expect(validateFormat("YYYY-MM", "month", "new")).toBe("Duplicate format ");
        expect(validateFormat("YYYY-MM", "month", "m")).toBe("");
    });
});
