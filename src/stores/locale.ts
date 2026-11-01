import { get } from 'svelte/store';
import { settingsStore } from '@/settings';
import { toSupportedWeekStart } from "@/weeks";
import { localeWeekStart } from "@/calendar-locale";

function calendarLocale(): string {
    return get(settingsStore).localeSettings.localeOverride;
}

function updateLocaleKeySetting(localeKey: string) {
    settingsStore.update((settings) => ({
        ...settings,
        localeSettings: {
            ...settings.localeSettings,
            localeOverride: localeKey
        }
    }))
}
export function updateWeekStartSetting(weekStartId: number = localeWeekStart(calendarLocale())) {
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
 * Upstream also switched the moment shared by Obsidian and every plugin to it (`window.moment.locale()`)
 */
export function switchLocale(localeKey: string) {
    updateLocaleKeySetting(localeKey);
    updateWeekStartSetting();
}
