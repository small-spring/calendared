import { describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

// The format check reads the week start from the settings store; give it a stand-in
vi.mock("@/app-service", () => ({ PluginService: { getPlugin: () => null } }));
vi.mock("@/settings", () => ({ settingsStore: writable({ localeSettings: { weekStartId: 1 } }) }));

const { formatsToReset } = await import("./format-on-close");

type Period = { enabled: boolean; format: string };
const periods = (overrides: Partial<Record<"day" | "week" | "month" | "quarter" | "year", Period>> = {}) => ({
    day: { enabled: true, format: "YYYY-MM-DD" },
    week: { enabled: true, format: "GGGG-[W]WW" },
    month: { enabled: true, format: "YYYY-MM" },
    quarter: { enabled: true, format: "YYYY-[Q]Q" },
    year: { enabled: true, format: "YYYY" },
    ...overrides,
});

describe("formatsToReset: 設定画面を閉じるとき、既定に戻す書式", () => {
    it("どれも正しければ、戻すものはない", () => {
        expect(formatsToReset(periods())).toEqual([]);
    });

    it("オンの周期の、空かまちがった書式を戻す", () => {
        expect(formatsToReset(periods({ month: { enabled: true, format: "YYYY-MM-DD" }, year: { enabled: true, format: " " } }))).toEqual([
            "month",
            "year",
        ]);
    });

    it("ほかの周期にまちがった同じ書式があっても、正しい書式は戻さない", () => {
        expect(formatsToReset(periods({ month: { enabled: true, format: "DD.MM.YYYY" }, day: { enabled: true, format: "DD.MM.YYYY" } }))).toEqual([
            "month",
        ]);
    });

    it("オフの周期は、書式がまちがっていても触らない（今あるノートを探すのに使っている）", () => {
        expect(formatsToReset(periods({ week: { enabled: false, format: "YYYY-[W]WW" }, quarter: { enabled: false, format: "" } }))).toEqual([]);
    });
});
