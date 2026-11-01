import { notesWithFormat } from "./io/notes-by-format";
import type { IGranularity } from "./io/types";
import { renameForFormat } from "./periods";
import type { PeriodRules } from "./periods";

const has = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);

// Calendared: what the migrations change, decided without Obsidian (docs/adr/0023, 0024). The settings' migration page
// (settings/ui/migrations) shows these plans and carries them out

/** A note to rename from a previous format to the current one. `conflict`: a file already has the new name, so it is skipped */
export type PlannedRename = { from: string; to: string; conflict: boolean };

/**
 * The notes a previous format reads in a period's folder, and the name each gets in the current format (in the same
 * folder). Nothing is overwritten: a new name that a file already has, or that another note being renamed has now (the
 * result would depend on the order), is a conflict. Names differing only in case count as the same, except the note's
 * own name: Obsidian renames a note to the same name in other case even where the file system ignores case
 */
export function planFormatRenames(
  files: { path: string; basename: string; extension: string }[],
  granularity: IGranularity,
  { folder, fromFormat, toFormat }: { folder: string; fromFormat: string; toFormat: string },
  rules: PeriodRules,
): PlannedRename[] {
  if (fromFormat.trim() === toFormat.trim()) return [];
  // How many files have each name, case aside. The note itself is left out of its own count, so a rename
  // that only changes case (2026-w44 → 2026-W44) isn't a conflict with itself
  const taken = new Map<string, number>();
  for (const file of files) taken.set(file.path.toLowerCase(), (taken.get(file.path.toLowerCase()) ?? 0) + 1);
  const basenames = new Map(files.map((file) => [file.path, file.basename]));

  return notesWithFormat(files, granularity, { folder, format: fromFormat }, rules).flatMap((from) => {
    const name = renameForFormat(basenames.get(from)!, granularity, fromFormat, toFormat, rules);
    if (!name || name === basenames.get(from)) return [];
    const to = `${from.slice(0, from.lastIndexOf("/") + 1)}${name}.md`;
    const others = (taken.get(to.toLowerCase()) ?? 0) - (to.toLowerCase() === from.toLowerCase() ? 1 : 0);
    return [{ from, to, conflict: others > 0 }];
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
