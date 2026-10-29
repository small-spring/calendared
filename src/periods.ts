import type { IGranularity } from "./io/types";

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
