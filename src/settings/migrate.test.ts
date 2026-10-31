import { describe, expect, it } from "vitest";
import { migrateFormatSettings } from "./migrate";

const format = (id: string, value: string) => ({ id, value, error: "", loading: false });

describe("migrateFormatSettings: 保存された設定の、周期ごとの書式の一覧を 1 つの書式に読み替える（ADR-0019）", () => {
    it("書式が複数あれば、新しいノートに使っていた（選んでいた）書式を残す", () => {
        const saved = {
            periods: {
                week: {
                    enabled: true,
                    selectedFormat: format("b", "GGGG-[W]WW"),
                    formats: { a: format("a", "YYYY-[W]ww"), b: format("b", "GGGG-[W]WW") },
                    folder: "週",
                },
            },
        };
        expect(migrateFormatSettings(saved)).toEqual({ periods: { week: { enabled: true, format: "GGGG-[W]WW", folder: "週" } } });
    });

    it("選んでいた書式が空なら、一覧の空でない最初の書式を残す。どれもなければ既定の書式", () => {
        const saved = {
            periods: {
                day: { selectedFormat: format("a", ""), formats: { a: format("a", ""), b: format("b", "YYYYMMDD") } },
                month: { selectedFormat: format("a", " "), formats: { a: format("a", " ") } },
            },
        };
        expect(migrateFormatSettings(saved)).toEqual({ periods: { day: { format: "YYYYMMDD" }, month: { format: "YYYY-MM" } } });
    });

    it("もう 1 つの書式になっている設定は、そのまま", () => {
        const saved = { periods: { day: { format: "YYYY-MM-DD", folder: "/" } }, other: 1 };
        expect(migrateFormatSettings(saved)).toEqual(saved);
    });

    it("周期の設定がなければ、何もしない", () => {
        expect(migrateFormatSettings({})).toEqual({});
    });

    it("元の設定は書き換えない", () => {
        const saved = { periods: { year: { selectedFormat: format("a", "YYYY"), formats: { a: format("a", "YYYY") } } } };
        migrateFormatSettings(saved);
        expect(saved.periods.year.formats).toBeDefined();
    });
});
