// Calendared: the words for the periods that the settings, the notices and the commands share
import { getPeriodicityFromGranularity } from "./io/parse";
import type { IGranularity } from "./io/types";
import { capitalize } from "./utils";

/** "Daily", "Weekly", ... */
export function periodicityTitle(granularity: IGranularity): string {
  return capitalize(getPeriodicityFromGranularity(granularity));
}

/** Shown where a period that is turned off would make or open a note */
export function turnedOffMessage(granularity: IGranularity): string {
  return `${periodicityTitle(granularity)} notes are turned off in settings`;
}

/** Shown where a note would be made with a format that can't name it; `error` is the settings' error for the format */
export function invalidFormatMessage(granularity: IGranularity, error: string): string {
  return `${periodicityTitle(granularity)} note format is invalid: ${error.replace(/\s+/g, " ")}`;
}

const CURRENT_NOTE: Record<IGranularity, string> = {
  day: "today's note",
  week: "this week's note",
  month: "this month's note",
  quarter: "this quarter's note",
  year: "this year's note",
};

/** "Today's note", "This week's note", ...; with "open", the command's name ("Open today's note") */
export function currentNoteName(granularity: IGranularity, as?: "open"): string {
  const name = CURRENT_NOTE[granularity];
  return as === "open" ? `Open ${name}` : name[0].toUpperCase() + name.slice(1);
}
