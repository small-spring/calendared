import { normalizePath } from "obsidian";
import { formatPeriod, parsePeriod, type PeriodRules } from "@/periods";
import type { IGranularity } from "./types";

/**
 * Calendared: the paths of the notes a format reads in a period's folder (and the folders under it): Markdown files
 * named exactly what the format writes for some period. Counted from the vault each time the settings show them
 * (docs/adr/0016); upstream kept the list in the settings (data.json) and updated it on every file event
 */
export function notesWithFormat(
  files: { path: string; basename: string; extension: string }[],
  granularity: IGranularity,
  { folder, format }: { folder: string; format: string },
  rules: PeriodRules,
): string[] {
  return files
    .filter((file) => file.extension === "md" && isInFolder(file.path, folder))
    .filter((file) => {
      const period = parsePeriod(file.basename, granularity, format, rules);
      return !!period && formatPeriod(period, format, rules) === file.basename;
    })
    .map((file) => file.path);
}

/** Calendared: whether the path is in the folder or a folder under it. Every path is in "/" */
export function isInFolder(path: string, folder: string): boolean {
  const root = normalizePath(folder);
  return root === "/" || path.startsWith(`${root}/`);
}
