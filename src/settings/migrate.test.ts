import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./constants";
import { migrateFormatSettings, settingsFromSaved } from "./migrate";

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

describe("settingsFromSaved: 保存された設定（data.json）を、今の設定の形にして読み込む", () => {
    const defaults = DEFAULT_SETTINGS;

    it("何も保存されていなければ（最初の起動）、既定の設定", () => {
        expect(settingsFromSaved(null, defaults)).toEqual(defaults);
    });

    it("入れ子の設定に、保存したあとで足した項目があれば、その既定値を入れる（保存した値はそのまま）", () => {
        const saved = {
            periods: { quarter: { enabled: true, format: "YYYY-[Q]Q", folder: "四半期", templatePath: "" } },
            localeSettings: { weekStartId: 0 },
            breadcrumbs: {},
        };
        const loaded = settingsFromSaved(saved, defaults);
        expect(loaded.periods.quarter).toEqual({ ...defaults.periods.quarter, enabled: true, folder: "四半期" });
        expect(loaded.periods.day).toEqual(defaults.periods.day);
        expect(loaded.localeSettings).toEqual({ ...defaults.localeSettings, weekStartId: 0 });
        expect(loaded.breadcrumbs).toEqual(defaults.breadcrumbs);
    });

    it("既定の設定を書き換えない（読み込んだ設定を変えても既定はそのまま）", () => {
        const loaded = settingsFromSaved({}, defaults);
        loaded.periods.day.enabled = false;
        loaded.localeSettings.weekStartId = 6;
        expect(defaults.periods.day.enabled).toBe(true);
        expect(defaults.localeSettings.weekStartId).not.toBe(6);
    });

    it("元の版の使われない設定を捨てる（1.2 のステッカーの記号、1.2 より前の設定も）", () => {
        const saved = {
            stickerPrefix: "#",
            lastUsedStickerPrefixes: ["#"],
            shouldConfirmBeforeStickerMigrate: true,
            viewLeafPosition: "right",
            leafViewEnabled: false,
            validFormats: { day: ["YYYY-MM-DD"] },
            allowLocalesSwitchFromCommandPalette: false,
            lastPreviewFilepath: "",
            localeSettings: { localeOverride: "en", weekStartId: 1, showWeekNums: true, showQuarterNums: true, weekNumbering: "iso" },
            periods: { day: { enabled: true, format: "YYYY-MM-DD", folder: "/", templatePath: "", preview: {} } },
        };
        const loaded = settingsFromSaved(saved, defaults) as unknown as Record<string, unknown>;
        for (const key of ["stickerPrefix", "lastUsedStickerPrefixes", "shouldConfirmBeforeStickerMigrate", "viewLeafPosition",
            "leafViewEnabled", "validFormats", "allowLocalesSwitchFromCommandPalette", "lastPreviewFilepath"]) {
            expect(loaded).not.toHaveProperty(key);
        }
        expect(loaded.localeSettings).toEqual({ localeOverride: "en", weekStartId: 1 });
        expect((loaded.periods as Record<string, unknown>).day).not.toHaveProperty("preview");
    });

    it("週の始まりは土・日・月のどれかにする", () => {
        expect(settingsFromSaved({ localeSettings: { weekStartId: 3 } }, defaults).localeSettings.weekStartId).toBe(1);
    });

    it("オフの周期は起動時に開かない（オンに戻しても開かない。ADR-0045）", () => {
        const saved = { periods: { month: { enabled: false, openAtStartup: true } } };
        expect(settingsFromSaved(saved, defaults).periods.month.openAtStartup).toBe(false);
    });

    it("書式の一覧は 1 つの書式にする（ADR-0019）", () => {
        const saved = { periods: { day: { selectedFormat: format("a", "YYYYMMDD"), formats: { a: format("a", "YYYYMMDD") } } } };
        expect(settingsFromSaved(saved, defaults).periods.day.format).toBe("YYYYMMDD");
    });
});
