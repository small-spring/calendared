import { defaultWeekdays, defaultWeekdaysShort } from '@/localization';
import { get, writable } from 'svelte/store';
import { settingsStore } from '@/settings';
import { displayedDateStore } from './dates';
import { toSupportedWeekStart } from "@/weeks";

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

function setMomentLocale(localeKey: string) {
    window.moment.locale(localeKey);
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
export function updateWeekStartSetting(weekStartId: number = window.moment.localeData().firstDayOfWeek()) {
    settingsStore.update((settings) => ({
        ...settings,
        localeSettings: {
            ...settings.localeSettings,
            // Calendared: weeks start on Saturday, Sunday or Monday only (docs/periods.md, ADR-003)
            weekStartId: toSupportedWeekStart(weekStartId)
        }
    }))

    updateWeekdays()
}

export function updateWeekdays() {
    const weekStartId = get(settingsStore).localeSettings.weekStartId;

    const localizedWeekdays = window.moment.localeData().weekdays();
    const localizedWeekdaysShort = window.moment.localeData().weekdaysMin();
    const weekdays = [
        ...localizedWeekdays.slice(weekStartId),
        ...localizedWeekdays.slice(0, weekStartId)
    ];
    const weekdaysShort = [
        ...localizedWeekdaysShort.slice(weekStartId),
        ...localizedWeekdaysShort.slice(0, weekStartId)
    ];

    localeDataStore.set({
        weekdays,
        weekdaysShort
    });
}

export function switchLocale(localeKey: string) {
    setMomentLocale(localeKey);
    updateLocaleKeySetting(localeKey);
    updateWeekStartSetting();

    // trigger <Calendar /> rerender to use new locale
    displayedDateStore.set(get(displayedDateStore).locale(localeKey));
}

export function setupLocale() {
    setMomentLocale(get(settingsStore).localeSettings.localeOverride);
    updateWeekdays();
}
