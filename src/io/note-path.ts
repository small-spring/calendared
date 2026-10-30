import { normalizePath } from "obsidian";
import { formatPeriod, periodOf } from "@/periods";
import type { WeekScheme } from "@/weeks";
import type { IGranularity } from "./types";

// Credit: @creationix/path.js
export function join(...partSegments: string[]): string {
  // Split the inputs into a list of path commands.
  let parts: string[] = [];
  for (let i = 0, l = partSegments.length; i < l; i++) {
    parts = parts.concat(partSegments[i].split("/"));
  }
  // Interpret the path commands to get the new resolved path.
  const newParts = [];
  for (let i = 0, l = parts.length; i < l; i++) {
    const part = parts[i];
    // Remove leading and trailing slashes
    // Also remove "." segments
    if (!part || part === ".") continue;
    // Push new path segments.
    else newParts.push(part);
  }
  // Preserve the initial slash if there was one.
  if (parts[0] === "") newParts.unshift("");
  // Turn back into a single string path.
  return newParts.join("/");
}

/**
 * Calendared: the path of the note for the period that contains the date (a week by the week scheme: its row's Monday,
 * see docs/spec/periods.md). Everything it depends on is an argument, so a caller that reads the settings reactively
 * recomputes it when they change (docs/adr/0016)
 */
export function notePath(
  granularity: IGranularity,
  date: moment.Moment,
  { folder, format }: { folder: string; format: string },
  weeks: WeekScheme,
): string {
  let filename = formatPeriod(periodOf(granularity, date, weeks), format, weeks);
  if (!filename.endsWith(".md")) {
    filename += ".md";
  }
  return normalizePath(join(folder, filename));
}
