import { normalizePath } from "obsidian";
import { parsePeriod, rangeOfPeriod, type PeriodName, type PeriodRules } from "@/periods";
import type { IGranularity } from "./types";

/**
 * Calendared: the paths of the notes a format reads in a period's folder (and the folders under it): Markdown files
 * named exactly what the format writes for some period (parsePeriod checks it). Counted from the vault each time the
 * settings show them (docs/adr/0016); upstream kept the list in the settings (data.json) and updated it on every file event
 */
export function notesWithFormat(
  files: { path: string; basename: string; extension: string }[],
  granularity: IGranularity,
  { folder, format }: { folder: string; format: string },
  rules: PeriodRules,
): string[] {
  return files.filter((file) => !!periodOfNote(file, granularity, { folder, format }, rules)).map((file) => file.path);
}

/**
 * Calendared: the period a file is the note of, by the rule the counts, the migrations and the periodic note check
 * share (docs/adr/0044): a Markdown file in the period's folder (or a folder under it), named exactly what the format
 * writes for that period. null when it is not
 */
export function periodOfNote(
  file: { path: string; basename: string; extension: string },
  granularity: IGranularity,
  { folder, format }: { folder: string; format: string },
  rules: PeriodRules,
): PeriodName | null {
  if (file.extension !== "md" || !isInFolder(file.path, folder)) return null;
  return parsePeriod(file.basename, granularity, format, rules);
}

/**
 * The note of the period nearest before / after `start` (the first day of a period), among the notes the format reads
 * in the period's folder. Open previous / next periodic note skip the periods that have no note. null when there is none
 */
export function nearestNote<F extends { path: string; basename: string; extension: string }>(
  files: F[],
  granularity: IGranularity,
  setting: { folder: string; format: string },
  rules: PeriodRules,
  start: moment.Moment,
  direction: "previous" | "next",
): F | null {
  const ahead = (a: moment.Moment, b: moment.Moment) => (direction === "previous" ? a.isBefore(b, "day") : a.isAfter(b, "day"));
  let nearest: { file: F; start: moment.Moment } | null = null;
  for (const file of files) {
    const period = periodOfNote(file, granularity, setting, rules);
    const range = period && rangeOfPeriod(period, rules);
    if (!range || !ahead(range.start, start)) continue;
    if (!nearest || ahead(nearest.start, range.start)) nearest = { file, start: range.start };
  }
  return nearest?.file ?? null;
}

/** Calendared: whether the path is in the folder or a folder under it. Every path is in "/" */
export function isInFolder(path: string, folder: string): boolean {
  const root = normalizePath(folder);
  return root === "/" || path.startsWith(`${root}/`);
}
