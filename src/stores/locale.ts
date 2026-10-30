import { defaultWeekdays, defaultWeekdaysShort } from '@/localization';
import { get, writable } from 'svelte/store';
import { settingsStore } from '@/settings';
import { toSupportedWeekStart } from "@/weeks";
import { localeWeekStart, weekdayNames } from "@/calendar-locale";

type TLocaleData = {
    weekdays: string[];
    weekdaysShort: string[];
};

/**
    * used in <Calendar />'s header
*/
export const localeDataStore = writable<TLocaleData>({
    weekdays: defaultWeekdays,
    weekdaysShort: defaultWeekdaysShort
});

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

    updateWeekdays()
}

/** Calendared: the weekday header in the calendar's language, from the week's first day */
export function updateWeekdays() {
    localeDataStore.set(weekdayNames(calendarLocale(), get(settingsStore).localeSettings.weekStartId));
}

/**
 * Calendared: the calendar's language only changes the setting; the calendar formats its dates in it (calendar-locale.ts).
 * Upstream also switched the moment shared by Obsidian and every plugin to it (`window.moment.locale()`)
 */
export function switchLocale(localeKey: string) {
    updateLocaleKeySetting(localeKey);
    updateWeekStartSetting();
}

export function setupLocale() {
    updateWeekdays();
}
