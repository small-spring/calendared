import type { IGranularity } from "./io/types";
import { tokenize } from "./format-tokens";
import { weekSchemeFor, type WeekName, type WeekScheme } from "./weeks";

// Calendared: plain date calculations about periods (no Obsidian), unit tested in periods.test.ts

// ---- How each period is cut (docs/adr/0014, 0039) ----

/**
 * Where a 12-month cycle (a quarterly or yearly note's year) starts, and which of its two years names it.
 * January with either naming is the calendar year
 */
export interface YearCycle {
  /** 1 (January) to 12 */
  startMonth: number;
  /** "start": May 2026 – Apr 2027 is 2026; "end": it is 2027 */
  yearInName: 'start' | 'end';
}

/** The calendar year: quarters and years start in January */
export const CALENDAR_YEAR: YearCycle = { startMonth: 1, yearInName: 'start' };

/** How every period is cut: weeks by the week scheme, quarters and years each by their own cycle (docs/adr/0039) */
export interface PeriodRules {
  weeks: WeekScheme;
  quarter: YearCycle;
  year: YearCycle;
}

export function periodRules(weeks: WeekScheme, cycles: Partial<Record<'quarter' | 'year', YearCycle>> = {}): PeriodRules {
  return { weeks, quarter: cycles.quarter ?? CALENDAR_YEAR, year: cycles.year ?? CALENDAR_YEAR };
}

/** The rules the settings set: the week start, and the quarters' and years' own cycles */
export function periodRulesFor(settings: {
  localeSettings: { weekStartId: number };
  periods: Record<'quarter' | 'year', { startMonth?: number; yearInName?: 'start' | 'end' }>;
}): PeriodRules {
  return periodRules(weekSchemeFor(settings.localeSettings), {
    quarter: yearCycleOf(settings.periods.quarter),
    year: yearCycleOf(settings.periods.year),
  });
}

/** A cycle as saved in a period's settings; missing values are the calendar year */
export function yearCycleOf(saved: { startMonth?: number; yearInName?: 'start' | 'end' }): YearCycle {
  const month = saved.startMonth;
  return {
    startMonth: Number.isInteger(month) && month! >= 1 && month! <= 12 ? month! : 1,
    yearInName: saved.yearInName === 'end' ? 'end' : 'start',
  };
}

/** How much the year in a name is ahead of the year the cycle starts in */
const nameOffset = (cycle: YearCycle) => (cycle.startMonth !== 1 && cycle.yearInName === 'end' ? 1 : 0);

/** The year the cycle containing the date starts in */
function cycleStartYear(date: moment.Moment, cycle: YearCycle): number {
  return date.month() + 1 >= cycle.startMonth ? date.year() : date.year() - 1;
}

// ---- Period names and operations (docs/adr/0009, 0010) ----

/**
 * A periodic note by its name, as its file name says it ("week 44 of 2026", "October 2026").
 * Months and quarters count from 1. How long a week is comes from the week scheme
 */
export type PeriodName =
  | { granularity: 'day'; year: number; month: number; day: number }
  | ({ granularity: 'week' } & WeekName)
  | { granularity: 'month'; year: number; month: number }
  | { granularity: 'quarter'; year: number; quarter: number }
  | { granularity: 'year'; year: number };

/** The period of `granularity` that contains the date */
export function periodOf(granularity: IGranularity, date: moment.Moment, rules: PeriodRules): PeriodName {
  switch (granularity) {
    case 'day':
      return { granularity, year: date.year(), month: date.month() + 1, day: date.date() };
    case 'week':
      return { granularity, ...rules.weeks.weekOf(date) };
    case 'month':
      return { granularity, year: date.year(), month: date.month() + 1 };
    case 'quarter': {
      const cycle = rules.quarter;
      const monthsIn = (date.month() + 1 - cycle.startMonth + 12) % 12;
      return { granularity, year: cycleStartYear(date, cycle) + nameOffset(cycle), quarter: Math.floor(monthsIn / 3) + 1 };
    }
    case 'year':
      return { granularity, year: cycleStartYear(date, rules.year) + nameOffset(rules.year) };
  }
}

/** First and last day of the period; null if no such period exists (e.g. week 53 of a 52-week year) */
export function rangeOfPeriod(period: PeriodName, rules: PeriodRules): { start: moment.Moment; end: moment.Moment } | null {
  if (period.granularity === 'week') {
    return rules.weeks.rangeOf(period);
  }
  const start = startOfPeriod(period, rules);
  if (!start) return null;
  const end = period.granularity === 'quarter' || period.granularity === 'year'
    ? start.clone().add(1, period.granularity).subtract(1, 'day')
    : start.clone().endOf(period.granularity).startOf('day');
  return { start, end };
}

/** The first day of the period that contains the date (a week: the first day of its calendar row) */
export function periodStart(granularity: IGranularity, date: moment.Moment, rules: PeriodRules): moment.Moment {
  // Calendared: quarters and years start in their own month (docs/adr/0039)
  return rangeOfPeriod(periodOf(granularity, date, rules), rules)!.start;
}

/** Whether the two dates are in the same period (a quarter or year by its own start month) */
export function samePeriod(granularity: IGranularity, a: moment.Moment, b: moment.Moment, rules: PeriodRules): boolean {
  return periodStart(granularity, a, rules).isSame(periodStart(granularity, b, rules), "day");
}

/** The 12 months of the year that contains the date, from the year's start month (the month view and the month picker) */
export function monthsOfYear(date: moment.Moment, rules: PeriodRules): moment.Moment[] {
  const start = periodStart("year", date, rules);
  return Array.from({ length: 12 }, (_, i) => start.clone().add(i, "months"));
}

/** The period `amount` periods before (negative) or after (positive). Steps through dates, never through the numbers in the name */
export function shiftPeriod(period: PeriodName, amount: number, rules: PeriodRules): PeriodName {
  if (period.granularity === 'week') {
    return { granularity: 'week', ...rules.weeks.shift(period, amount) };
  }
  const start = startOfPeriod(period, rules);
  if (!start) throw new Error(`No such ${period.granularity}: ${JSON.stringify(period)}`);
  return periodOf(period.granularity, start.add(amount, period.granularity), rules);
}

/** Whether any day of the period falls in the displayed month (the calendar then shows it already) */
export function overlapsMonth(period: PeriodName, displayed: moment.Moment, rules: PeriodRules): boolean {
  const range = rangeOfPeriod(period, rules);
  if (!range) return false;
  return !range.end.isBefore(displayed, 'month') && !range.start.isAfter(displayed, 'month');
}

/** A periodic note's file name */
export function formatPeriod(period: PeriodName, format: string, rules: PeriodRules): string {
  if (period.granularity === 'week') {
    return rules.weeks.format(period, format);
  }
  const start = startOfPeriod(period, rules);
  if (!start) throw new Error(`No such ${period.granularity}: ${JSON.stringify(period)}`);
  if (period.granularity === 'quarter' || period.granularity === 'year') {
    // a cycle that doesn't start in January: the year (and quarter) tokens write the name's numbers, not the first day's
    if (rules[period.granularity].startMonth !== 1) return start.format(withNameNumbers(format, period));
  }
  return start.format(format);
}

/**
 * The period a periodic note's file name stands for; null if it doesn't match the format or no such period exists.
 * The name must be exactly what the format writes for that period (moment also reads "october" for MMMM, for example)
 */
export function parsePeriod(fileName: string, granularity: IGranularity, format: string, rules: PeriodRules): PeriodName | null {
  const period = readPeriod(fileName, granularity, format, rules);
  return period && formatPeriod(period, format, rules) === fileName ? period : null;
}

/** The period moment reads from the name, which may not write back the same */
function readPeriod(fileName: string, granularity: IGranularity, format: string, rules: PeriodRules): PeriodName | null {
  if (granularity === 'week') {
    const week = rules.weeks.parse(fileName, format);
    return week && { granularity, ...week };
  }
  const date = window.moment(fileName, format, true);
  if (!date.isValid()) return null;
  if ((granularity === 'quarter' || granularity === 'year') && rules[granularity].startMonth !== 1) {
    // moment reads the numbers in the name as a calendar date; take them as the name's numbers instead (a format with
    // other tokens, like a month, then doesn't write back the same)
    return granularity === 'quarter'
      ? { granularity, year: date.year(), quarter: date.quarter() }
      : { granularity, year: date.year() };
  }
  return periodOf(granularity, date, rules);
}

/** The file name a periodic note gets when its format changes; null if `fileName` isn't a note of `fromFormat` */
export function renameForFormat(fileName: string, granularity: IGranularity, fromFormat: string, toFormat: string, rules: PeriodRules): string | null {
  const period = parsePeriod(fileName, granularity, fromFormat, rules);
  return period && formatPeriod(period, toFormat, rules);
}

/**
 * How a year of the cycle is written in labels: "2026" for the calendar year, "2026–27" for a cycle that doesn't start
 * in January (from the year it starts, whichever year names the notes; docs/adr/0039)
 */
export function cycleYearLabel(period: Extract<PeriodName, { granularity: 'year' }>, cycle: YearCycle): string {
  if (cycle.startMonth === 1) return String(period.year);
  const start = period.year - nameOffset(cycle);
  return `${start}–${String(start + 1).slice(-2)}`;
}

/** The period's first day; null if no such period exists */
function startOfPeriod(period: Exclude<PeriodName, { granularity: 'week' }>, rules: PeriodRules): moment.Moment | null {
  let start: moment.Moment;
  switch (period.granularity) {
    case 'day':
      start = window.moment({ year: period.year, month: period.month - 1, day: period.day });
      break;
    case 'month':
      start = window.moment({ year: period.year, month: period.month - 1, day: 1 });
      break;
    case 'quarter': {
      if (!Number.isInteger(period.quarter) || period.quarter < 1 || period.quarter > 4) return null;
      const { startMonth } = rules.quarter;
      start = window.moment({ year: period.year - nameOffset(rules.quarter), month: startMonth - 1, day: 1 })
        .add((period.quarter - 1) * 3, 'months');
      break;
    }
    case 'year':
      start = window.moment({ year: period.year - nameOffset(rules.year), month: rules.year.startMonth - 1, day: 1 });
      break;
  }
  return start.isValid() ? start : null;
}

/**
 * The format with its year and quarter tokens written as [literal] text of the name's numbers (docs/adr/0041).
 * Other text stays, kept in [brackets]
 */
function withNameNumbers(format: string, period: Extract<PeriodName, { granularity: 'quarter' | 'year' }>): string {
  const literal = (text: string) => `[${text}]`;
  return tokenize(format).map((part) => {
    if (part.kind === 'text') return literal(part.text);
    const { token } = part;
    if (period.granularity === 'quarter' && token === 'Q') return literal(String(period.quarter));
    if (token === 'YY') return literal(String(period.year).slice(-2).padStart(2, '0'));
    if (token === 'YYYY') return literal(String(period.year).padStart(4, '0'));
    if (token === 'Y') return literal(String(period.year));
    return token;
  }).join('');
}
