// Calendared: the week scheme decides what a "week" is (docs/periods.md, ADR-003/004/006).
// Everything else asks it instead of counting weeks itself, so another scheme can be added later

/** A week by its name, as a weekly note's file name says it: week `week` of week-based year `weekYear` */
export type WeekName = { weekYear: number; week: number };

export interface WeekScheme {
    /** the week that contains the date */
    weekOf(date: moment.Moment): WeekName;
    /** first and last day of the week (one row of the calendar); null if no such week exists */
    rangeOf(week: WeekName): { start: moment.Moment; end: moment.Moment } | null;
    /** the week `amount` weeks before (negative) or after (positive) */
    shift(week: WeekName, amount: number): WeekName;
    /** a weekly note's file name */
    format(week: WeekName, format: string): string;
    /** the week a weekly note's file name stands for; null if it doesn't match the format or no such week exists */
    parse(fileName: string, format: string): WeekName | null;
}

/**
 * Google Calendar's week numbers: weeks are calendar rows starting on `weekStart`
 * (moment's day numbers: 6 = Saturday, 0 = Sunday, 1 = Monday), named after the ISO 8601 week of the row's Monday
 */
export function createIsoWeekScheme(weekStart: number): WeekScheme {
    /** days from the row's first day to its Monday (Monday start: 0, Sunday: 1, Saturday: 2) */
    const toMonday = (1 - weekStart + 7) % 7;

    const rowStart = (date: moment.Moment) => date.clone().startOf("day").subtract((date.day() - weekStart + 7) % 7, "days");
    const nameOfMonday = (monday: moment.Moment): WeekName => ({ weekYear: monday.isoWeekYear(), week: monday.isoWeek() });
    const mondayOf = (week: WeekName) => {
        const monday = window.moment(`${week.weekYear}-W${String(week.week).padStart(2, "0")}`, "GGGG-[W]WW", true);
        return monday.isValid() ? monday : null;
    };
    const requireMondayOf = (week: WeekName) => {
        const monday = mondayOf(week);
        if (!monday) throw new Error(`No such week: ${week.weekYear}-W${week.week}`);
        return monday;
    };

    const scheme: WeekScheme = {
        weekOf: (date) => nameOfMonday(rowStart(date).add(toMonday, "days")),
        rangeOf: (week) => {
            const monday = mondayOf(week);
            if (!monday) return null;
            const start = monday.subtract(toMonday, "days");
            return { start, end: start.clone().add(6, "days") };
        },
        shift: (week, amount) => nameOfMonday(requireMondayOf(week).add(amount, "weeks")),
        // the row's Monday carries the ISO week-based year and week number, so ISO tokens (GGGG, WW) name the row
        format: (week, format) => requireMondayOf(week).format(format),
        // moment reads a week name as that week's first day, which depends on the tokens (ISO: Monday; ww/gggg: the
        // language's week start). The middle of that week is in the row sharing most of its days, whatever the start
        parse: (fileName, format) => {
            const date = window.moment(fileName, format, true);
            return date.isValid() ? scheme.weekOf(date.add(3, "days")) : null;
        },
    };
    return scheme;
}

/** The week starts Calendared offers, like Google Calendar: Saturday, Sunday or Monday (moment's day numbers) */
export function toSupportedWeekStart(weekStartId: number): number {
    if (weekStartId === 0 || weekStartId === 6) return weekStartId;
    // Tuesday to Thursday are closest to Monday, Friday to Saturday
    return weekStartId === 5 ? 6 : 1;
}

/** The week scheme for the settings. Only "iso" exists so far (ADR-006); settings saved before the field existed use it too */
export function weekSchemeFor(settings: { weekStartId: number; weekNumbering?: "iso" }): WeekScheme {
    return createIsoWeekScheme(toSupportedWeekStart(settings.weekStartId));
}

/**
 * The ISO version of a weekly note format: only the year and week tokens change (YYYY / gggg → GGGG, ww → WW),
 * the rest and anything in [brackets] stays. Used to suggest a format that matches the calendar's week numbers
 */
export function isoWeekFormatFor(format: string): string {
    const replacements: Record<string, string> = { YYYY: "GGGG", YY: "GG", gggg: "GGGG", gg: "GG", ww: "WW", w: "W" };
    return format.replace(/\[[^\]]*\]|Y+|g+|w+/g, (token) => replacements[token] ?? token);
}

/** The years checked by `checkWeekFormat`: every weekday January 1 can fall on, in leap and common years */
const CHECKED_YEARS = { from: 2024, to: 2035 };

/**
 * Where a weekly note format goes wrong with this week scheme, with the first example found:
 * - `unreadable`: a week whose file name doesn't read back as that week (e.g. YYYY with ww around New Year)
 * - `mismatched`: a week whose file name shows another number than the calendar (e.g. gggg / ww, the language's weeks)
 */
export function checkWeekFormat(format: string, scheme: WeekScheme): {
    unreadable: { week: WeekName; name: string } | null;
    mismatched: { week: WeekName; name: string; expected: string } | null;
} {
    const iso = isoWeekFormatFor(format);
    let unreadable: { week: WeekName; name: string } | null = null;
    let mismatched: { week: WeekName; name: string; expected: string } | null = null;

    const last = scheme.weekOf(window.moment({ year: CHECKED_YEARS.to, month: 11, day: 31 }));
    // at most 53 weeks a year; the bound only guards against a scheme whose shift doesn't move forward
    const maxWeeks = (CHECKED_YEARS.to - CHECKED_YEARS.from + 2) * 53;
    let week = scheme.weekOf(window.moment({ year: CHECKED_YEARS.from, month: 0, day: 1 }));
    for (let i = 0; i < maxWeeks; i++, week = scheme.shift(week, 1)) {
        const name = scheme.format(week, format);
        const readBack = scheme.parse(name, format);
        if (!unreadable && (!readBack || readBack.weekYear !== week.weekYear || readBack.week !== week.week)) {
            unreadable = { week, name };
        }
        const expected = scheme.format(week, iso);
        if (!mismatched && name !== expected) {
            mismatched = { week, name, expected };
        }
        if ((unreadable && mismatched) || (week.weekYear === last.weekYear && week.week === last.week)) break;
    }
    return { unreadable, mismatched };
}
