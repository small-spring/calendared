import type { IGranularity } from "./io/types";
import type { WeekName, WeekScheme } from "./weeks";

// Calendared: plain date calculations about periods (no Obsidian), unit tested in periods.test.ts

/**
 * Whether the calendar's displayed month already shows this periodic note
 * (its day, a day of its week, or a month inside its month / quarter / year)
 */
export function isNoteOnDisplayedMonth(granularity: IGranularity, date: moment.Moment, displayed: moment.Moment) {
  if (granularity === 'week') {
    return date.isSame(displayed, 'month') || date.clone().add(6, 'days').isSame(displayed, 'month');
  }
  if (granularity === 'day') {
    return date.isSame(displayed, 'month');
  }
  return date.isSame(displayed, granularity);
}

/** The date of the period before / after the one starting at `date`, in the same granularity */
export function getAdjacentPeriodDate(granularity: IGranularity, date: moment.Moment, pos: 'previous' | 'next') {
  return date.clone()[pos === 'next' ? 'add' : 'subtract'](1, granularity);
}

// ---- Period names and operations (docs/periods.md, ADR-001/002) ----

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
export function periodOf(granularity: IGranularity, date: moment.Moment, weeks: WeekScheme): PeriodName {
  switch (granularity) {
    case 'day':
      return { granularity, year: date.year(), month: date.month() + 1, day: date.date() };
    case 'week':
      return { granularity, ...weeks.weekOf(date) };
    case 'month':
      return { granularity, year: date.year(), month: date.month() + 1 };
    case 'quarter':
      return { granularity, year: date.year(), quarter: date.quarter() };
    case 'year':
      return { granularity, year: date.year() };
  }
}

/** First and last day of the period; null if no such period exists (e.g. week 53 of a 52-week year) */
export function rangeOfPeriod(period: PeriodName, weeks: WeekScheme): { start: moment.Moment; end: moment.Moment } | null {
  if (period.granularity === 'week') {
    return weeks.rangeOf(period);
  }
  const start = startOfCalendarPeriod(period);
  if (!start.isValid()) return null;
  return { start, end: start.clone().endOf(period.granularity).startOf('day') };
}

/** The period `amount` periods before (negative) or after (positive). Steps through dates, never through the numbers in the name */
export function shiftPeriod(period: PeriodName, amount: number, weeks: WeekScheme): PeriodName {
  if (period.granularity === 'week') {
    return { granularity: 'week', ...weeks.shift(period, amount) };
  }
  return periodOf(period.granularity, startOfCalendarPeriod(period).add(amount, period.granularity), weeks);
}

/** Whether any day of the period falls in the displayed month (the calendar then shows it already) */
export function overlapsMonth(period: PeriodName, displayed: moment.Moment, weeks: WeekScheme): boolean {
  const range = rangeOfPeriod(period, weeks);
  if (!range) return false;
  return !range.end.isBefore(displayed, 'month') && !range.start.isAfter(displayed, 'month');
}

/** A periodic note's file name */
export function formatPeriod(period: PeriodName, format: string, weeks: WeekScheme): string {
  if (period.granularity === 'week') {
    return weeks.format(period, format);
  }
  return startOfCalendarPeriod(period).format(format);
}

/** The period a periodic note's file name stands for; null if it doesn't match the format or no such period exists */
export function parsePeriod(fileName: string, granularity: IGranularity, format: string, weeks: WeekScheme): PeriodName | null {
  if (granularity === 'week') {
    const week = weeks.parse(fileName, format);
    return week && { granularity, ...week };
  }
  const date = window.moment(fileName, format, true);
  return date.isValid() ? periodOf(granularity, date, weeks) : null;
}

function startOfCalendarPeriod(period: Exclude<PeriodName, { granularity: 'week' }>): moment.Moment {
  switch (period.granularity) {
    case 'day':
      return window.moment({ year: period.year, month: period.month - 1, day: period.day });
    case 'month':
      return window.moment({ year: period.year, month: period.month - 1, day: 1 });
    case 'quarter':
      return window.moment({ year: period.year, month: (period.quarter - 1) * 3, day: 1 });
    case 'year':
      return window.moment({ year: period.year, month: 0, day: 1 });
  }
}
