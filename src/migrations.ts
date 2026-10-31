import { notesWithFormat } from "./io/notes-by-format";
import type { IGranularity } from "./io/types";
import { renameForFormat } from "./periods";
import type { WeekScheme } from "./weeks";

const has = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);

// Calendared: what the migrations change, decided without Obsidian (docs/adr/0023, 0024). The settings' migration page
// (settings/ui/migrations) shows these plans and carries them out

/** A note to rename from a previous format to the current one. `conflict`: a file already has the new name, so it is skipped */
export type PlannedRename = { from: string; to: string; conflict: boolean };

/**
 * The notes a previous format reads in a period's folder, and the name each gets in the current format (in the same
 * folder). Nothing is overwritten: a new name that a file already has, or that another note being renamed has now (the
 * result would depend on the order), is a conflict. Names differing only in case count as the same
 */
export function planFormatRenames(
  files: { path: string; basename: string; extension: string }[],
  granularity: IGranularity,
  { folder, fromFormat, toFormat }: { folder: string; fromFormat: string; toFormat: string },
  weeks: WeekScheme,
): PlannedRename[] {
  if (fromFormat.trim() === toFormat.trim()) return [];
  const taken = new Set(files.map((file) => file.path.toLowerCase()));
  const basenames = new Map(files.map((file) => [file.path, file.basename]));

  return notesWithFormat(files, granularity, { folder, format: fromFormat }, weeks).flatMap((from) => {
    const name = renameForFormat(basenames.get(from)!, granularity, fromFormat, toFormat, weeks);
    if (!name || name === basenames.get(from)) return [];
    const to = `${from.slice(0, from.lastIndexOf("/") + 1)}${name}.md`;
    return [{ from, to, conflict: taken.has(to.toLowerCase()) }];
  });
}

/** A note whose sticker moves from a previous property to the current one. `conflict`: it has the current one already, so it is skipped */
export type PlannedStickerMove = { path: string; value: unknown; conflict: boolean };

/** The notes that have the previous property, and its value. A note that has the current property already (even empty) is a conflict */
export function planStickerMoves(
  notes: { path: string; frontmatter?: Record<string, unknown> | null }[],
  fromProperty: string,
  toProperty: string,
): PlannedStickerMove[] {
  if (fromProperty === toProperty) return [];
  return notes.flatMap(({ path, frontmatter }) =>
    frontmatter && has(frontmatter, fromProperty)
      ? [{ path, value: frontmatter[fromProperty], conflict: has(frontmatter, toProperty) }]
      : [],
  );
}

/**
 * Moves the value of the previous property to the current one, in a note's properties (inside `processFrontMatter`).
 * Changes nothing and returns false when the note has the current property, or no longer has the previous one
 */
export function moveSticker(frontmatter: Record<string, unknown>, fromProperty: string, toProperty: string): boolean {
  if (!has(frontmatter, fromProperty) || has(frontmatter, toProperty)) return false;
  frontmatter[toProperty] = frontmatter[fromProperty];
  delete frontmatter[fromProperty];
  return true;
}
