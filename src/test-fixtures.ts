import moment from "moment";
import { TFile } from "obsidian";
import { derived, writable } from "svelte/store";
import type { IGranularity } from "@/io/types";
import { periodRules, periodRulesFor } from "@/periods";
import type { ISettings, PeriodSettings } from "@/settings/constants";
import { createIsoWeekScheme } from "@/weeks";

// Calendared: what many tests build the same way (docs/guides/development.md, "テスト"). Nothing here may import
// "@/settings": tests replace it, and settingsModule runs while it is being replaced

// ---- 日付 ----

/** the date written YYYY-MM-DD */
export const d = (s: string) => moment(s, "YYYY-MM-DD");

/** a date as YYYY-MM-DD (null stays null) */
export function ymd(m: moment.Moment): string;
export function ymd(m: moment.Moment | null): string | null;
export function ymd(m: moment.Moment | null) {
    return m?.format("YYYY-MM-DD") ?? null;
}

// ---- 週の始まり ----

/** the period rules with Monday-first weeks, quarters and years from January */
export const mondayWeeks = periodRules(createIsoWeekScheme(1));
/** the period rules with Sunday-first weeks, quarters and years from January */
export const sundayWeeks = periodRules(createIsoWeekScheme(0));

// ---- 書式 ----

/** the default format of each period */
export const FORMATS = { day: "YYYY-MM-DD", week: "GGGG-[W]WW", month: "YYYY-MM", quarter: "YYYY-[Q]Q", year: "YYYY" } as const;

// ---- ファイル ----

/** a file at `path` as the plain-object stand-in the path rules read (its name and extension from the path) */
export const md = (path: string) => {
    const name = path.slice(path.lastIndexOf("/") + 1);
    const dot = name.lastIndexOf(".");
    return { path, basename: dot === -1 ? name : name.slice(0, dot), extension: dot === -1 ? "" : name.slice(dot + 1) };
};

/** Obsidian's file at `path` (the stand-in TFile, for code that checks `instanceof TFile`) */
export const fileAt = (path: string) => Object.assign(new TFile(), { path });

// ---- 設定 ----

/**
 * Settings for the tests: every period on with its default format at the vault's top, Monday-first weeks, English.
 * `periods` changes some periods' settings. Only what the tested code reads is there; the rest of ISettings is missing
 */
export function testSettings(periods: Partial<Record<IGranularity, Partial<PeriodSettings>>> = {}): ISettings {
    const period = (g: IGranularity): PeriodSettings => ({
        enabled: true,
        openAtStartup: false,
        format: FORMATS[g],
        folder: "/",
        templatePath: "",
        ...periods[g],
    });
    return {
        periods: { day: period("day"), week: period("week"), month: period("month"), quarter: period("quarter"), year: period("year") },
        localeSettings: { localeOverride: "en", weekStartId: 1 },
        stickersEnabled: true,
        stickerProperty: "sticker",
    } as ISettings;
}

/**
 * What a test puts in place of "@/settings": the settings store (starting from `settings`) and the period rules made
 * from it, like src/settings/store.ts. vi.mock's factory runs before the test's imports, so load this inside it:
 * `vi.mock("@/settings", async () => (await import("@/test-fixtures")).settingsModule())`
 */
export function settingsModule(settings: ISettings = testSettings()) {
    const settingsStore = writable(settings);
    const periodRulesStore = derived(settingsStore, (s) => periodRulesFor(s));
    return { settingsStore, periodRulesStore };
}
