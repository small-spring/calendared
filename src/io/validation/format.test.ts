import { describe, expect, it, vi } from "vitest";

// The check reads the week start from the settings store; give it a stand-in
vi.mock("@/app-service", () => ({ PluginService: { getPlugin: () => null } }));
vi.mock("@/settings", async () => (await import("@/test-fixtures")).settingsModule());

const { validateFormat } = await import("./format");
const { settingsStore } = await import("@/settings");

describe("validateFormat: 書式の誤り（設定画面に出す文）", () => {
    // which tokens a period may use and which it needs are tested in src/format-tokens.test.ts; here, the messages and
    // that the format reads back

    it("空の書式は誤りにしない", () => {
        expect(validateFormat("", "day")).toBe("");
    });

    it("ファイル名に使えない文字は誤り", () => {
        expect(validateFormat("YYYY:MM:DD", "day")).toBe("Format contains illegal characters");
    });

    it("周期に要る記号がなければ、足りないものを挙げる（[ ] の中の文字は数えない）", () => {
        expect(validateFormat("YYYY-MM", "day")).toBe("Ambiguous format. Missing day (D) info. Can't uniquely identify day.");
        expect(validateFormat("[YYYY]-MM", "month")).toMatch(/^Ambiguous format\. Missing year/);
    });

    it.each([
        ["day", "GGGG-MM-DD", "GGGG can't be used in daily note names. Use the year, month and day (or the ISO week-based year, week and weekday together)."],
        ["week", "GGGG-[W]WW-DD", "DD can't be used in weekly note names. Use the week-based year (GGGG) and week (WW)."],
        ["month", "YYYY-Mo", "Mo can't be used in monthly note names. Use the year and month."],
        ["quarter", "YYYY-Qo", "Qo can't be used in quarterly note names. Use the year and quarter (Q)."],
        ["year", "y", "y can't be used in yearly note names. Use the year."],
    ] as const)("%s: 使えない記号があれば、その記号と、その周期で使える記号を出す（docs/adr/0040）", (granularity, format, message) => {
        expect(validateFormat(format, granularity)).toBe(message);
    });

    it("正しい書式は、ほかの周期では誤りになる（だから周期どうしで書式を比べなくてよい。docs/adr/0040）", () => {
        const valid = {
            day: ["YYYY-MM-DD", "YYYYMMDD", "DD.MM.YYYY", "YYYY-MM-Do", "LL", "GGGG-[W]WW-E", "YYYY-MM-DD ddd"],
            week: ["GGGG-[W]WW", "gggg-[W]ww"],
            month: ["YYYY-MM", "YY-MM", "YYYY年M月", "MMMM YYYY", "[Year] YYYY [Month] MM"],
            quarter: ["YYYY-[Q]Q", "YY[Q]Q"],
            year: ["YYYY", "[FY]YY", "YYYY[年度]"],
        } as const;
        for (const [g, formats] of Object.entries(valid)) {
            for (const format of formats) {
                expect(validateFormat(format, g as keyof typeof valid), `${g} ${format}`).toBe("");
                for (const other of Object.keys(valid)) {
                    if (other !== g) expect(validateFormat(format, other as keyof typeof valid), `${other} ${format}`).not.toBe("");
                }
            }
        }
    });

    it("ほかの周期にまちがった同じ書式があっても、正しい書式は誤りにしない（正しい書式どうしはぶつからない）", () => {
        settingsStore.update((s) => ({ ...s, periods: { ...s.periods, month: { ...s.periods.month, format: "DD.MM.YYYY" } } }));
        try {
            expect(validateFormat("DD.MM.YYYY", "day")).toBe("");
        } finally {
            settingsStore.update((s) => ({ ...s, periods: { ...s.periods, month: { ...s.periods.month, format: "YYYY-MM" } } }));
        }
    });
});
