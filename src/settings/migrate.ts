import { DEFAULT_FORMATS_PER_GRANULARITY } from "@/constants";
import { type IGranularity } from "@/io";
import { migratePlacementSettings, migrateTimelineSettings } from "@/navigation";
import { toSupportedWeekStart } from "@/weeks";
import { REMOVED_LOCALE_SETTINGS, REMOVED_PERIOD_SETTINGS, REMOVED_SETTINGS, type ISettings } from "./constants";

type SavedFormat = { value?: unknown };

/**
 * Calendared: saved settings from when a period had a list of formats (one for new notes, the others to read existing
 * notes) become the one format a period has now (docs/adr/0019): the one used for new notes is kept
 */
export function migrateFormatSettings(saved: Record<string, unknown>): Record<string, unknown> {
    const periods = saved.periods as Record<string, Record<string, unknown>> | undefined;
    if (!periods) return saved;

    const migrated: Record<string, Record<string, unknown>> = {};
    for (const [granularity, period] of Object.entries(periods)) {
        if (!("selectedFormat" in period) && !("formats" in period)) {
            migrated[granularity] = period;
            continue;
        }
        const { selectedFormat, formats, ...rest } = period as { selectedFormat?: SavedFormat; formats?: Record<string, SavedFormat> };
        const candidates = [selectedFormat, ...Object.values(formats ?? {})].map((f) => f?.value);
        const kept = candidates.find((value): value is string => typeof value === "string" && !!value.trim());
        migrated[granularity] = { ...rest, format: kept ?? DEFAULT_FORMATS_PER_GRANULARITY[granularity as IGranularity] };
    }
    return { ...saved, periods: migrated };
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The defaults with the saved values put over them at every level, so a setting added inside a nested one (a period's,
 * the breadcrumbs'...) after the settings were saved gets its default. Upstream merged the top level only. Makes new
 * objects all the way down, so changing the result never changes the defaults
 */
function mergeOver(defaults: unknown, saved: unknown): unknown {
    if (isPlainObject(defaults) && isPlainObject(saved)) {
        const merged: Record<string, unknown> = {};
        for (const key of new Set([...Object.keys(defaults), ...Object.keys(saved)])) {
            merged[key] = key in saved ? mergeOver(defaults[key], saved[key]) : mergeOver(undefined, defaults[key]);
        }
        return merged;
    }
    if (saved === undefined) return isPlainObject(defaults) ? mergeOver({}, defaults) : defaults;
    return isPlainObject(saved) ? mergeOver({}, saved) : saved;
}

const without = (object: Record<string, unknown>, keys: readonly string[]) => {
    for (const key of keys) delete object[key];
};

/**
 * Calendared: the settings to use from those saved in data.json (null on the first start). Upstream's settings become
 * today's (the timeline's become the breadcrumbs' and mini calendar's, docs/adr/0031, 0033; a period's list of formats its
 * one format, docs/adr/0019), and those of removed features are dropped so they don't linger
 */
export function settingsFromSaved(saved: unknown, defaults: ISettings): ISettings {
    const migrated = migrateFormatSettings(migratePlacementSettings(migrateTimelineSettings(isPlainObject(saved) ? saved : {})));
    const settings = mergeOver(defaults, migrated) as ISettings;

    without(settings as unknown as Record<string, unknown>, REMOVED_SETTINGS);
    without(settings.localeSettings as unknown as Record<string, unknown>, REMOVED_LOCALE_SETTINGS);
    // weeks start on Saturday, Sunday or Monday only (docs/spec/periods.md)
    settings.localeSettings.weekStartId = toSupportedWeekStart(settings.localeSettings.weekStartId);
    for (const period of Object.values(settings.periods)) {
        without(period as unknown as Record<string, unknown>, REMOVED_PERIOD_SETTINGS);
        // a period turned off doesn't open at startup, even once it's turned on again (docs/adr/0045)
        if (!period.enabled) period.openAtStartup = false;
    }
    return settings;
}
