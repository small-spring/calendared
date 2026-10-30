import { granularities } from "./constants";
import type { IGranularity } from "./io/types";
import type { WeekScheme } from "./weeks";

// Calendared: the breadcrumbs and the mini calendar above a note (docs/adr/0031, 0032), apart from Obsidian so they can
// be tested. They replace upstream's timeline

/** Where a feature shows: on every device, on phones only (tablets keep the side calendar in view), or nowhere */
export type Placement = "always" | "phone" | "never";
/** How the mini calendar lays out days: the calendar's week, or the note in the middle with 3 days each side */
export type DayLayout = "week" | "centered";

export interface BreadcrumbsSettings {
    placement: Placement;
    /** also show it on notes that aren't periodic notes (it then shows where now is) */
    onOtherNotes: boolean;
}
export interface MiniCalendarSettings {
    placement: Placement;
    onOtherNotes: boolean;
    dayLayout: DayLayout;
    displayStickers: boolean;
}

export const DEFAULT_BREADCRUMBS: BreadcrumbsSettings = { placement: "always", onOtherNotes: true };
export const DEFAULT_MINI_CALENDAR: MiniCalendarSettings = {
    placement: "always",
    onOtherNotes: true,
    dayLayout: "week",
    displayStickers: true,
};

/**
 * Saved settings with upstream's `timeline` read as the two features' settings: a timeline that was on shows both
 * everywhere, one that was off shows neither. Which notes it showed on and whether it showed stickers carry over;
 * the rest (unique timelines, open or closed at first) has no counterpart. Settings already saved the new way are kept
 */
export function migrateTimelineSettings(saved: Record<string, unknown>): Record<string, unknown> {
    if (!("timeline" in saved)) return saved;
    const { timeline, ...rest } = saved;
    if ("breadcrumbs" in rest || "miniCalendar" in rest) return rest;
    const old = (timeline ?? {}) as { enabled?: boolean; displayOnRestNotes?: boolean; displayStickers?: boolean };
    const placement: Placement = old.enabled === false ? "never" : "always";
    const onOtherNotes = old.displayOnRestNotes ?? DEFAULT_BREADCRUMBS.onOtherNotes;
    return {
        breadcrumbs: { placement, onOtherNotes },
        miniCalendar: {
            ...DEFAULT_MINI_CALENDAR,
            placement,
            onOtherNotes,
            displayStickers: old.displayStickers ?? DEFAULT_MINI_CALENDAR.displayStickers,
        },
        ...rest,
    };
}

export function showsOn(placement: Placement, isPhone: boolean): boolean {
    return placement === "always" || (placement === "phone" && isPhone);
}

/** The finest period in use: a note that isn't a periodic note shows where now is in it (today, if days are used) */
export function finestEnabled(enabled: Record<IGranularity, boolean>): IGranularity {
    return granularities.find((g) => enabled[g]) ?? "day";
}

/** The first day of the period that contains the date (a week: the first day of its calendar row) */
export function periodStart(granularity: IGranularity, date: moment.Moment, weeks: WeekScheme): moment.Moment {
    if (granularity === "week") return weeks.rangeOf(weeks.weekOf(date))!.start;
    return date.clone().startOf(granularity);
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
    weeks: WeekScheme,
): moment.Moment[] {
    const count = granularity === "day" ? 7 : 5;
    const side = Math.floor(count / 2);
    const middle = periodStart(granularity, date, weeks).add(offset * count, granularity);
    const first =
        granularity === "day" && dayLayout === "week"
            ? periodStart("week", middle, weeks)
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
 * Where the note is, from the year down to the note itself ("2026 › Q4 › 10月 › W44 › 30日"). A week's year, quarter
 * and month are its Thursday's, the day ISO 8601 takes the week's year from, so they agree with its week number.
 * Disabled weeks and quarters are left out (you know where you are without them); disabled months and years stay,
 * but can't be opened. The last crumb, the note itself, always shows
 */
export function breadcrumbs(
    granularity: IGranularity,
    date: moment.Moment,
    enabled: Record<IGranularity, boolean>,
    weeks: WeekScheme,
): Crumb[] {
    const own = granularities.indexOf(granularity);
    const thursday = granularity === "week" ? isoThursday(date, weeks) : date;
    return [...granularities]
        .reverse()
        .filter((g) => granularities.indexOf(g) >= own)
        .filter((g) => g === granularity || enabled[g] || g === "month" || g === "year")
        .map((g) => ({
            granularity: g,
            date: periodStart(g, g === "week" || g === "day" ? date : thursday, weeks),
            canOpen: g === granularity || enabled[g],
        }));
}

/** The Thursday of the ISO week a calendar row is named after (the row's Monday + 3 days) */
function isoThursday(date: moment.Moment, weeks: WeekScheme): moment.Moment {
    const { weekYear, week } = weeks.weekOf(date);
    return window.moment(`${weekYear}-W${String(week).padStart(2, "0")}-4`, "GGGG-[W]WW-E", true);
}

/** A crumb's text in the calendar's language: "2026", "Q4", "10月" / "Oct", "W44", "30日" / "30" */
export function crumbText(granularity: IGranularity, date: moment.Moment, locale: string, weeks: WeekScheme): string {
    switch (granularity) {
        case "year":
            return String(date.year());
        case "quarter":
            return `Q${date.quarter()}`;
        case "month":
            return new Intl.DateTimeFormat(locale, { month: "short" }).format(date.toDate());
        case "week":
            return `W${String(weeks.weekOf(date).week).padStart(2, "0")}`;
        case "day":
            return new Intl.DateTimeFormat(locale, { day: "numeric" }).format(date.toDate());
    }
}

/**
 * Whether the open note is the one Open now opens: now in the finest period in use (docs/adr/0030). `note` is the
 * open note's period, or null when it isn't a periodic note
 */
export function isNowNote(
    note: { granularity: IGranularity; date: moment.Moment } | null,
    enabled: Record<IGranularity, boolean>,
    today: moment.Moment,
    weeks: WeekScheme,
): boolean {
    const granularity = finestEnabled(enabled);
    if (!note || note.granularity !== granularity) return false;
    return periodStart(granularity, note.date, weeks).isSame(periodStart(granularity, today, weeks), "day");
}
