/**
 * Calendared: the calendar's language. The calendar writes month and weekday names in the language set in the
 * settings (`localeSettings.localeOverride`), on copies of the dates. Upstream switched the moment that Obsidian and
 * every plugin share (`window.moment.locale()`), so other plugins' dates (e.g. Templater's) changed language too and
 * stayed changed after turning the plugin off. Dates are still computed, and file names still written, in Obsidian's
 * own language, like the core Daily notes plugin.
 */

/** A copy of the date that formats in the given language */
export function inLocale(date: moment.Moment, locale: string): moment.Moment {
  return date.clone().locale(locale);
}

/** Weekday names in the language, starting from the week's first day (0 = Sunday) */
export function weekdayNames(locale: string, weekStartId: number): { weekdays: string[]; weekdaysShort: string[] } {
  const data = window.moment.localeData(locale);
  const fromWeekStart = (names: string[]) => [...names.slice(weekStartId), ...names.slice(0, weekStartId)];
  return { weekdays: fromWeekStart(data.weekdays()), weekdaysShort: fromWeekStart(data.weekdaysMin()) };
}

/**
 * The calendar's weekday header: the short names of the days in a row of the month grid.
 * Calendared: written from the grid's own days, so the header always matches the columns. Upstream kept the names in
 * a store that had to be refreshed by hand whenever the language or the week start changed
 */
export function weekdayHeader(days: moment.Moment[], locale: string): string[] {
  return days.map((day) => inLocale(day, locale).format("dd"));
}

/** Obsidian's language codes that moment knows by another name (as Obsidian 1.14.5 maps them) */
const OBSIDIAN_TO_MOMENT: Record<string, string> = { zh: "zh-cn", cz: "cs", no: "nb" };

/**
 * The moment language Obsidian writes its dates in, from its app language (`getLanguage()`): lower-cased, a few codes
 * renamed, and English when moment doesn't know it, the way Obsidian sets its own moment at startup.
 * Calendared: the calendar's default language (docs/adr/0046). Upstream took the OS language (`navigator.languages`)
 */
export function obsidianMomentLocale(language: string, known: string[]): string {
  const lower = language.toLowerCase();
  const key = OBSIDIAN_TO_MOMENT[lower] ?? lower;
  return known.includes(key) ? key : "en";
}

/** The day weeks usually start on in the language (0 = Sunday) */
export function localeWeekStart(locale: string): number {
  return window.moment.localeData(locale).firstDayOfWeek();
}

import type { WeekScheme } from "./weeks";

export type IWeek = { days: moment.Moment[] };
export type IMonth = IWeek[];

/**
 * The 6 weeks (42 days) the calendar shows for a month: from the first day of the week that contains the 1st.
 * Calendared: upstream found the 1st's place by looking its weekday name up in a list of names, so the names and the
 * date had to be in the same language. Where a week starts comes from the week scheme (docs/adr/0014)
 */
export function monthGrid(displayedDate: moment.Moment, weeks: WeekScheme): IMonth {
  const startOfMonth = displayedDate.clone().date(1);
  let date = weeks.rangeOf(weeks.weekOf(startOfMonth))!.start;

  const month: IMonth = [];
  for (let i = 0; i < 6; i++) {
    const week: IWeek = { days: [] };
    for (let j = 0; j < 7; j++) {
      week.days.push(date);
      date = date.clone().add(1, "days");
    }
    month.push(week);
  }
  return month;
}
