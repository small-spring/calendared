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
        parse: (fileName, format) => {
            const date = window.moment(fileName, format, true);
            return date.isValid() ? scheme.weekOf(date) : null;
        },
    };
    return scheme;
}
