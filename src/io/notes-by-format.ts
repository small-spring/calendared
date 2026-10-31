import { normalizePath } from "obsidian";
import { formatPeriod, parsePeriod, type PeriodRules } from "@/periods";
import type { IGranularity } from "./types";

/** Inside a backup folder upstream made (`periodic-notes-BACKUP-<timestamp>`) */
export function isBackupPath(path: string): boolean {
  return path.split("/").some((segment) => {
    if (segment.startsWith("periodic-notes-BACKUP-")) {
      const timestamp = segment.replace("periodic-notes-BACKUP-", "");
      return window.moment(timestamp, "YYYYMMDDHHmmss", true).isValid();
    }
    return false;
  });
}

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
  const root = normalizePath(folder);
  const inFolder = (path: string) => root === "/" || path.startsWith(`${root}/`);

  return files
    .filter((file) => file.extension === "md" && inFolder(file.path) && !isBackupPath(file.path))
    .filter((file) => {
      const period = parsePeriod(file.basename, granularity, format, rules);
      return !!period && formatPeriod(period, format, rules) === file.basename;
    })
    .map((file) => file.path);
}
