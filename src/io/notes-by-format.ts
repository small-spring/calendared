import { normalizePath } from "obsidian";
import { formatPeriod, parsePeriod } from "@/periods";
import type { WeekScheme } from "@/weeks";
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
  weeks: WeekScheme,
): string[] {
  const root = normalizePath(folder);
  const inFolder = (path: string) => root === "/" || path.startsWith(`${root}/`);

  return files
    .filter((file) => file.extension === "md" && inFolder(file.path) && !isBackupPath(file.path))
    .filter((file) => {
      const period = parsePeriod(file.basename, granularity, format, weeks);
      return !!period && formatPeriod(period, format, weeks) === file.basename;
    })
    .map((file) => file.path);
}

/**
 * Calendared: the notes only this format reads, for the confirmation before deleting it. Notes another format of the
 * period also reads (two formats that write the same name, e.g. `YYYY-[W]ww` and `GGGG-[W]WW`) are still recognized
 * after it is deleted, so they are not counted; upstream counted every note the format reads
 */
export function notesOnlyWithFormat(
  files: { path: string; basename: string; extension: string }[],
  granularity: IGranularity,
  { folder, format, others }: { folder: string; format: string; others: string[] },
  weeks: WeekScheme,
): string[] {
  const readByOthers = new Set(
    others
      .filter((other) => other.trim())
      .flatMap((other) => notesWithFormat(files, granularity, { folder, format: other }, weeks)),
  );
  return notesWithFormat(files, granularity, { folder, format }, weeks).filter((path) => !readByOthers.has(path));
}
