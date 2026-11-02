// Calendared: the migrations on the vault (docs/adr/0023, 0024). What they change is decided in migrations.ts, without Obsidian
import { PluginService } from "@/app-service";
import { granularities } from "@/constants";
import { type IGranularity, notesWithFormatIn, vaultSource } from "@/io";
import { moveSticker, planFormatRenames, planStickerMoves, type PlannedRename, type PlannedStickerMove } from "@/migrations";
import { stickerProperty } from "@/stickers";
import { getStickerProperty } from "@/ui/utils/emoji-picker";
import { get } from "svelte/store";
import type { ISettings } from "../../constants";
import { periodRulesStore, settingsStore } from "../../store";

export type MigrationResult = { changed: number; skipped: number };

/** The period's notes named with a previous format, and their names in the current one */
export function formatRenamePlan(granularity: IGranularity, fromFormat: string): PlannedRename[] {
  const s = get(settingsStore);
  const { folder, format } = s.periods[granularity];
  return planFormatRenames(vaultSource().markdownFiles(), granularity, { folder, fromFormat, toFormat: format }, get(periodRulesStore));
}

/** Periodic notes (of any period, by its current format and folder) that have the previous property */
export function stickerMovePlan(fromProperty: string): PlannedStickerMove[] {
  const s = get(settingsStore);
  const vault = vaultSource();
  const paths = new Set(granularities.flatMap((g) => notesWithFormatIn(g, s.periods[g].format, s)));
  const notes = [...paths].map((path) => {
    const file = vault.fileAt(path);
    return { path, frontmatter: file && vault.metadataOf(file)?.frontmatter };
  });
  return planStickerMoves(notes, fromProperty.trim(), stickerProperty(s.stickerProperty));
}

/**
 * Renames the notes one after another with Obsidian's rename, which also updates links to them ("Automatically update
 * internal links" is on: the list doesn't run otherwise). A note that got a conflict since the list was made is skipped too
 */
export async function renameNotes(renames: PlannedRename[], onProgress: (done: number) => void): Promise<MigrationResult> {
  const app = PluginService.getPlugin()!.app;
  const result = { changed: 0, skipped: 0 };
  for (const [i, { from, to }] of renames.entries()) {
    const file = app.vault.getFileByPath(from);
    if (!file || app.vault.getAbstractFileByPath(to)) {
      result.skipped++;
    } else {
      try {
        await app.fileManager.renameFile(file, to);
        result.changed++;
      } catch (error) {
        console.error(`Calendared: couldn't rename ${from}`, error);
        result.skipped++;
      }
    }
    onProgress(i + 1);
  }
  return result;
}

/** Moves the sticker of each note to the current property. A note that got the current property since the list was made is skipped */
export async function moveStickers(
  moves: PlannedStickerMove[],
  fromProperty: string,
  onProgress: (done: number) => void,
): Promise<MigrationResult> {
  const app = PluginService.getPlugin()!.app;
  const toProperty = getStickerProperty();
  const result = { changed: 0, skipped: 0 };
  for (const [i, { path }] of moves.entries()) {
    const file = app.vault.getFileByPath(path);
    let moved = false;
    try {
      if (file) await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => (moved = moveSticker(fm, fromProperty, toProperty)));
    } catch (error) {
      console.error(`Calendared: couldn't move the sticker of ${path}`, error);
    }
    if (moved) result.changed++;
    else result.skipped++;
    onProgress(i + 1);
  }
  return result;
}

/** How many notes still use the format or property a notice remembers */
export function formatNoticeCount(granularity: IGranularity, s: ISettings): number {
  const previous = s.migrationNotices.formats[granularity];
  return previous ? formatRenamePlan(granularity, previous).length : 0;
}
export function stickerNoticeCount(s: ISettings): number {
  const previous = s.migrationNotices.stickerProperty;
  return previous ? stickerMovePlan(previous).length : 0;
}

/** Forgets the formats and property no note uses any more (docs/adr/0035) */
export function forgetFinishedNotices() {
  const s = get(settingsStore);
  const formats = { ...s.migrationNotices.formats };
  for (const g of granularities) if (formats[g] && formatNoticeCount(g, s) === 0) delete formats[g];
  const sticker = s.migrationNotices.stickerProperty && stickerNoticeCount(s) > 0 ? s.migrationNotices.stickerProperty : null;
  if (Object.keys(formats).length === Object.keys(s.migrationNotices.formats).length && sticker === s.migrationNotices.stickerProperty) return;
  settingsStore.update((current) => ({ ...current, migrationNotices: { formats, stickerProperty: sticker } }));
}

/** Forgets one notice: the notes are kept as they are ("Keep as is") */
export function forgetNotice(which: IGranularity | "sticker") {
  settingsStore.update((s) => {
    if (which === "sticker") return { ...s, migrationNotices: { ...s.migrationNotices, stickerProperty: null } };
    const formats = { ...s.migrationNotices.formats };
    delete formats[which];
    return { ...s, migrationNotices: { ...s.migrationNotices, formats } };
  });
}
