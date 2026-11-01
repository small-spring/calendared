import { describe, expect, it, vi } from "vitest";
import { FORMATS } from "@/test-fixtures";

// The format check reads the week start from the settings store; give it a stand-in
vi.mock("@/app-service", () => ({ PluginService: { getPlugin: () => null } }));
vi.mock("@/settings", async () => (await import("@/test-fixtures")).settingsModule());

const { formatsToReset, savePendingEdits, trackPendingEdit } = await import("./format-on-close");

type Period = { enabled: boolean; format: string };
const periods = (overrides: Partial<Record<"day" | "week" | "month" | "quarter" | "year", Period>> = {}) => ({
    day: { enabled: true, format: FORMATS.day },
    week: { enabled: true, format: FORMATS.week },
    month: { enabled: true, format: FORMATS.month },
    quarter: { enabled: true, format: FORMATS.quarter },
    year: { enabled: true, format: FORMATS.year },
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

    it("オフの周期は、書式がまちがっていても触らない（今あるノートを探すのに使っている）", () => {
        expect(formatsToReset(periods({ week: { enabled: false, format: "YYYY-[W]WW" }, quarter: { enabled: false, format: "" } }))).toEqual([]);
    });
});

describe("savePendingEdits: まだ保存していない書式の入力を、閉じるときの確かめの前に保存する", () => {
    it("入力中の欄の保存をすぐ行う", () => {
        const save = vi.fn();
        const untrack = trackPendingEdit(save);
        savePendingEdits();
        expect(save).toHaveBeenCalledTimes(1);
        untrack();
    });

    it("消えた欄の保存は行わない", () => {
        const save = vi.fn();
        trackPendingEdit(save)();
        savePendingEdits();
        expect(save).not.toHaveBeenCalled();
    });
});
