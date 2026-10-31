import { IGranularity } from "@/io";
import { ISettings, settingsStore } from "@/settings";
import { calendarViews } from "@/settings/period-switch";
import { get, writable } from "svelte/store";

export const periodTabs = ['day', 'month', 'year'] as const;
export const crrTabStore = writable<(typeof periodTabs)[number]>('day');

export function getEnabledPeriods(periods?: ISettings["periods"]) {
    const enabledPeriods = Object.fromEntries(
        Object.entries(periods || get(settingsStore).periods).map(([g, s]) => [g, s.enabled]),
    ) as Record<IGranularity, boolean>;

    return {
        // Calendared: weeks alone show the day view and quarters alone the month view (calendarViews)
        tabs: calendarViews(enabledPeriods) as unknown as typeof periodTabs,
        enabledPeriods,
    };
}
