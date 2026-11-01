import { granularities } from "@/constants";
import type { IGranularity } from "@/io";

type PeriodSwitches<T> = Record<IGranularity, T & { enabled: boolean; openAtStartup: boolean }>;

/**
 * Calendared: turns a period on or off. Periods don't turn each other on or off: weeks can be used without days and
 * quarters without months (upstream linked them, since the calendar showed weeks and quarters only beside days and
 * months). The last period on stays on, so the calendar has something to show. Moved out of the settings' Svelte component.
 * A period turned off no longer opens at startup
 */
export function setPeriodEnabled<T>(periods: PeriodSwitches<T>, granularity: IGranularity, enabled: boolean): PeriodSwitches<T> {
    const next = Object.fromEntries(granularities.map((g) => [g, { ...periods[g] }])) as PeriodSwitches<T>;
    if (!enabled && granularities.every((g) => g === granularity || !next[g].enabled)) return next;

    next[granularity].enabled = enabled;
    // turning off the period that opens at startup sets startup to "Nothing", so turning it on again doesn't bring the
    // startup note back unasked (docs/adr/0045)
    if (!enabled) next[granularity].openAtStartup = false;
    return next;
}

/** Calendared: which periods are on, for the calendar, the breadcrumbs and Open now */
export function enabledPeriods(periods: Record<IGranularity, { enabled: boolean }>): Record<IGranularity, boolean> {
    return Object.fromEntries(granularities.map((g) => [g, periods[g].enabled])) as Record<IGranularity, boolean>;
}

/** Calendared: the period whose note opens at startup, or "none". Kept per period in the settings */
export function openAtStartupOf<T>(periods: PeriodSwitches<T>): IGranularity | "none" {
    return granularities.find((g) => periods[g].enabled && periods[g].openAtStartup) ?? "none";
}

export function setOpenAtStartup<T>(periods: PeriodSwitches<T>, choice: IGranularity | "none"): PeriodSwitches<T> {
    return Object.fromEntries(
        granularities.map((g) => [g, { ...periods[g], openAtStartup: g === choice }]),
    ) as PeriodSwitches<T>;
}

/**
 * Calendared: the calendar's view (day, month or year), decided only by the periods on. Weeks are the column beside the
 * days and quarters the column beside the months, so either one alone still shows its view. The month and year views
 * show only when the views before them have nothing on. Upstream kept the view picked on tabs, so turning days back on
 * left the month view showing
 */
export function calendarView(enabled: Record<IGranularity, boolean>): "day" | "month" | "year" {
    if (enabled.day || enabled.week) return "day";
    if (enabled.month || enabled.quarter) return "month";
    return "year";
}
