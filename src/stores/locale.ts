import { settingsStore } from '@/settings';
import { toSupportedWeekStart } from "@/weeks";

function updateLocaleKeySetting(localeKey: string) {
    settingsStore.update((settings) => ({
        ...settings,
        localeSettings: {
            ...settings.localeSettings,
            localeOverride: localeKey
        }
    }))
}
export function updateWeekStartSetting(weekStartId: number) {
    settingsStore.update((settings) => ({
        ...settings,
        localeSettings: {
            ...settings.localeSettings,
            // Calendared: weeks start on Saturday, Sunday or Monday only (docs/adr/0011)
            weekStartId: toSupportedWeekStart(weekStartId)
        }
    }))
}

/**
 * Calendared: the calendar's language only changes the setting; the calendar formats its dates in it (calendar-locale.ts).
 * Upstream also switched the moment shared by Obsidian and every plugin to it (`window.moment.locale()`), and reset the
 * week start to the language's. The week start stays: changing it changes the 7 days existing weekly notes stand for
 * (docs/adr/0047)
 */
export function switchLocale(localeKey: string) {
    updateLocaleKeySetting(localeKey);
}
