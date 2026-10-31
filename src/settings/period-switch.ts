import { granularities } from "@/constants";
import type { IGranularity } from "@/io";

type PeriodSwitches<T> = Record<IGranularity, T & { enabled: boolean; openAtStartup: boolean }>;

/**
 * Calendared: turns a period on or off with the rules the settings follow: weeks need days and quarters need months, and
 * one of days, months and years stays on (the calendar shows one of them). Moved out of the settings' Svelte component
 */
export function setPeriodEnabled<T>(periods: PeriodSwitches<T>, granularity: IGranularity, enabled: boolean): PeriodSwitches<T> {
    const next = Object.fromEntries(granularities.map((g) => [g, { ...periods[g] }])) as PeriodSwitches<T>;
    const isOn = (g: IGranularity) => (g === granularity ? enabled : next[g].enabled);
    if (granularity === "day" && !enabled && !isOn("month") && !isOn("year")) return next;

    next[granularity].enabled = enabled;
    if (granularity === "day" && !enabled) next.week.enabled = false;
    if (granularity === "week" && enabled) next.day.enabled = true;
    if (granularity === "month" && !enabled) next.quarter.enabled = false;
    if (granularity === "quarter" && enabled) next.month.enabled = true;
    if (!next.day.enabled && !next.month.enabled && !next.year.enabled) next.day.enabled = true;
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
