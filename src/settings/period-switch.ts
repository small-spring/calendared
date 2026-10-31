import { granularities } from "@/constants";
import type { IGranularity } from "@/io";

type PeriodSwitches<T> = Record<IGranularity, T & { enabled: boolean; openAtStartup: boolean }>;

/**
 * Calendared: turns a period on or off. Periods don't turn each other on or off: weeks can be used without days and
 * quarters without months (upstream linked them, since the calendar showed weeks and quarters only beside days and
 * months). The last period on stays on, so the calendar has something to show. Moved out of the settings' Svelte component
 */
export function setPeriodEnabled<T>(periods: PeriodSwitches<T>, granularity: IGranularity, enabled: boolean): PeriodSwitches<T> {
    const next = Object.fromEntries(granularities.map((g) => [g, { ...periods[g] }])) as PeriodSwitches<T>;
    if (!enabled && granularities.every((g) => g === granularity || !next[g].enabled)) return next;

    next[granularity].enabled = enabled;
    return next;
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
 * Calendared: the calendar's views (day, month, year) to show. Weeks are the column beside the days and quarters the
 * column beside the months, so either one alone still shows its view; upstream showed a view only when its own period was on
 */
export function calendarViews(enabled: Record<IGranularity, boolean>): ("day" | "month" | "year")[] {
    const views: ("day" | "month" | "year")[] = [];
    if (enabled.day || enabled.week) views.push("day");
    if (enabled.month || enabled.quarter) views.push("month");
    if (enabled.year) views.push("year");
    return views;
}
