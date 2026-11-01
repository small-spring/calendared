import { inLocale } from "./calendar-locale";
import { granularities } from "./constants";
import type { IGranularity } from "./io/types";
import { cycleYearLabel, periodOf, periodStart, samePeriod, type PeriodRules } from "./periods";

// Calendared: the breadcrumbs and the mini calendar above a note (docs/adr/0031, 0032), apart from Obsidian so they can
// be tested. They replace upstream's timeline

/** Where a feature shows when it is on: on every device, or on phones only (tablets keep the side calendar in view) */
export type Placement = "always" | "phone";
/** How the mini calendar lays out days: the calendar's week, or the note in the middle with 3 days each side */
export type DayLayout = "week" | "centered";

export interface BreadcrumbsSettings {
    /** the toggle on the section's heading; turning it off keeps `placement` for when it comes back on */
    enabled: boolean;
    placement: Placement;
    /** also show it on notes that aren't periodic notes (it then shows where now is) */
    onOtherNotes: boolean;
}
export interface MiniCalendarSettings {
    enabled: boolean;
    placement: Placement;
    onOtherNotes: boolean;
    dayLayout: DayLayout;
    displayStickers: boolean;
}

export const DEFAULT_BREADCRUMBS: BreadcrumbsSettings = { enabled: true, placement: "always", onOtherNotes: true };
export const DEFAULT_MINI_CALENDAR: MiniCalendarSettings = {
    enabled: true,
    placement: "always",
    onOtherNotes: true,
    dayLayout: "week",
    displayStickers: true,
};

/**
 * Saved settings with upstream's `timeline` read as the two features' settings: a timeline that was on turns both on
 * everywhere, one that was off turns both off. Which notes it showed on and whether it showed stickers carry over;
 * the rest (unique timelines, open or closed at first) has no counterpart. Settings already saved the new way are kept
 */
export function migrateTimelineSettings(saved: Record<string, unknown>): Record<string, unknown> {
    if (!("timeline" in saved)) return saved;
    const { timeline, ...rest } = saved;
    if ("breadcrumbs" in rest || "miniCalendar" in rest) return rest;
    const old = (timeline ?? {}) as { enabled?: boolean; displayOnRestNotes?: boolean; displayStickers?: boolean };
    const enabled = old.enabled !== false;
    const onOtherNotes = old.displayOnRestNotes ?? DEFAULT_BREADCRUMBS.onOtherNotes;
    return {
        breadcrumbs: { enabled, placement: "always", onOtherNotes },
        miniCalendar: {
            ...DEFAULT_MINI_CALENDAR,
            enabled,
            onOtherNotes,
            displayStickers: old.displayStickers ?? DEFAULT_MINI_CALENDAR.displayStickers,
        },
        ...rest,
    };
}

/**
 * Saved settings from when where each feature shows was one choice of three (Always / Phone only / Never) read as a
 * toggle and a choice of two (docs/adr/0033): Never becomes off, shown everywhere once turned back on
 */
export function migratePlacementSettings(saved: Record<string, unknown>): Record<string, unknown> {
    const migrated = { ...saved };
    for (const key of ["breadcrumbs", "miniCalendar"]) {
        const feature = saved[key] as { enabled?: boolean; placement?: string } | undefined;
        if (!feature || "enabled" in feature) continue;
        const never = feature.placement === "never";
        migrated[key] = { ...feature, enabled: !never, placement: never ? "always" : feature.placement };
    }
    return migrated;
}

export function showsOn(feature: { enabled: boolean; placement: Placement }, isPhone: boolean): boolean {
    return feature.enabled && (feature.placement === "always" || isPhone);
}

type BarFeature = { enabled: boolean; placement: Placement; onOtherNotes: boolean };

/**
 * Calendared: whether a note shows the breadcrumbs and the mini calendar: on where they are placed, and on a note that
 * isn't a periodic note only with "on other notes". The tabs (manager.ts) and the bar itself read it
 */
export function barShows(
    settings: { breadcrumbs: BarFeature; miniCalendar: BarFeature },
    isPhone: boolean,
    isPeriodic: boolean,
): { crumbs: boolean; mini: boolean } {
    const shows = (feature: BarFeature) => showsOn(feature, isPhone) && (isPeriodic || feature.onOtherNotes);
    return { crumbs: shows(settings.breadcrumbs), mini: shows(settings.miniCalendar) };
}

/** The finest period in use: a note that isn't a periodic note shows where now is in it (today, if days are used) */
export function finestEnabled(enabled: Record<IGranularity, boolean>): IGranularity {
    return granularities.find((g) => enabled[g]) ?? "day";
}

/**
 * The periods the mini calendar shows, each as its first day. Days: the calendar's week (or 3 days each side of the
 * note), 7 at a time. Other periods: the note in the middle with 2 each side, 5 at a time. `offset` counts how many
 * times ‹ › moved it (negative: back)
 */
export function stripDates(
    granularity: IGranularity,
    date: moment.Moment,
    offset: number,
    dayLayout: DayLayout,
    rules: PeriodRules,
): moment.Moment[] {
    const count = granularity === "day" ? 7 : 5;
    const side = Math.floor(count / 2);
    const middle = periodStart(granularity, date, rules).add(offset * count, granularity);
    const first =
        granularity === "day" && dayLayout === "week"
            ? periodStart("week", middle, rules)
            : middle.clone().subtract(side, granularity);
    return Array.from({ length: count }, (_, i) => first.clone().add(i, granularity));
}

export type Crumb = {
    granularity: IGranularity;
    /** the period's first day */
    date: moment.Moment;
    /** a disabled month or year shows where you are but can't open (or create) its note */
    canOpen: boolean;
};

/**
 * Where the note is, from the year down to the note itself ("2026 › Q4 › 10月 › W44 › 30日"). The periods above are
 * the ones containing the middle of the note's period (docs/adr/0039): a week's year, quarter and month are those of
 * the day the week scheme takes its year from (ISO 8601: its Thursday), so they agree with its week number; a quarter's year is its
 * second month's.
 * Disabled weeks and quarters are left out (you know where you are without them); disabled months and years stay,
 * but can't be opened. The last crumb, the note itself, always shows
 */
export function breadcrumbs(
    granularity: IGranularity,
    date: moment.Moment,
    enabled: Record<IGranularity, boolean>,
    rules: PeriodRules,
): Crumb[] {
    const own = granularities.indexOf(granularity);
    const middle =
        granularity === "week"
            ? rules.weeks.yearDayOf(rules.weeks.weekOf(date))!
            : granularity === "quarter"
              ? periodStart("quarter", date, rules).add(1, "month")
              : date;
    return [...granularities]
        .reverse()
        .filter((g) => granularities.indexOf(g) >= own)
        .filter((g) => g === granularity || enabled[g] || g === "month" || g === "year")
        .map((g) => ({
            granularity: g,
            date: periodStart(g, g === granularity ? date : middle, rules),
            canOpen: g === granularity || enabled[g],
        }));
}

/** A crumb's text in the calendar's language: "2026", "Q4", "10月" / "Oct", "W44", "30日" / "30th" */
export function crumbText(granularity: IGranularity, date: moment.Moment, locale: string, rules: PeriodRules): string {
    const period = periodOf(granularity, date, rules);
    switch (period.granularity) {
        case "year":
            // Calendared: "2026–27" for a year that doesn't start in January (docs/adr/0039)
            return cycleYearLabel(period, rules.year);
        case "quarter":
            return `Q${period.quarter}`;
        // Calendared: months and days in moment's language data, like the calendar. Intl threw on languages it doesn't
        // know (x-pseudo, oc-lnc), fell back to another language for others (tlh) and wrote Persian in the Persian calendar
        case "month":
            return inLocale(date, locale).format("MMM");
        case "week":
            return `W${String(period.week).padStart(2, "0")}`;
        case "day":
            return inLocale(date, locale).format("Do");
    }
}

/** A day with its month, in the calendar's language: "10月 30日" / "Oct 30th" (the mini calendar's "back" button) */
export function monthDayText(date: moment.Moment, locale: string): string {
    return inLocale(date, locale).format("MMM Do");
}

/**
 * Whether the open note is the one Open now opens: now in the finest period in use (docs/adr/0030). `note` is the
 * open note's period, or null when it isn't a periodic note
 */
export function isNowNote(
    note: { granularity: IGranularity; date: moment.Moment } | null,
    enabled: Record<IGranularity, boolean>,
    today: moment.Moment,
    rules: PeriodRules,
): boolean {
    const granularity = finestEnabled(enabled);
    if (!note || note.granularity !== granularity) return false;
    return samePeriod(granularity, note.date, today, rules);
}
