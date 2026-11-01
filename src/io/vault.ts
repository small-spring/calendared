import { Notice, TFile } from "obsidian";
import { IGranularity } from "./types";
import { stickerFrom, type TSticker } from "@/stickers";
import { vaultSource } from "./vault-source";
import { notesWithFormat } from "./notes-by-format";
import { type ISettings, settingsStore } from "@/settings";
import { get } from "svelte/store";
import { PluginService } from "@/app-service";
import { join, notePath, templateFilePath } from './note-path';
import { periodRulesFor } from '@/periods';
import { getPeriodicityFromGranularity } from "./parse";


export type TFileData = {
  file: TFile | null;
  sticker: TSticker | null
}

export async function ensureFolderExists(path: string): Promise<void> {
  const dirs = path.replace(/\\/g, "/").split("/");
  dirs.pop(); // remove basename

  if (dirs.length) {
    const dir = join(...dirs);
    if (!PluginService.getPlugin()?.app.vault.getAbstractFileByPath(dir)) {
      await PluginService.getPlugin()?.app.vault.createFolder(dir);
    }
  }
}

export function getNotePath(granularity: IGranularity, date: moment.Moment) {
  return periodNotePath(granularity, date, get(settingsStore));
}

/**
 * Calendared: getNotePath with the settings as an argument, for the UI to pass the settings it reads reactively
 * (docs/adr/0016)
 */
export function periodNotePath(
  granularity: IGranularity,
  date: moment.Moment,
  { periods, localeSettings }: Pick<ISettings, "periods" | "localeSettings">,
): string {
  // Calendared: a disabled period also uses its own format and folder, so its existing notes still open
  // (docs/spec/overview.md); upstream fell back to the default format and folder /
  const { format, folder } = periods[granularity];
  return notePath(granularity, date, { folder, format }, periodRulesFor({ periods, localeSettings }));
}

export function getFileData(
  granularity: IGranularity | null,
  date: moment.Moment | null,
): TFileData {
  if (!granularity || !date) return { file: null, sticker: null };
  return noteAt(granularity, date, get(settingsStore));
}

/**
 * Calendared: the period's note and its sticker, read through the vault source with the settings passed in.
 * Called while rendering with `$settingsStore`, it runs again when the settings change or Obsidian reports a change
 * (docs/adr/0016); upstream's views re-read on a store emitting a random number instead
 */
export function noteAt(
  granularity: IGranularity,
  date: moment.Moment,
  settings: Pick<ISettings, "periods" | "localeSettings" | "stickersEnabled" | "stickerProperty">,
): TFileData {
  const vault = vaultSource();
  const file = vault.fileAt(periodNotePath(granularity, date, settings));
  return { file, sticker: file && stickerFrom(vault.metadataOf(file), settings) };
}

/**
 * Calendared: the notes a format of a period reads, for the settings' file counts and lists. Read while rendering with
 * `$settingsStore`, it is counted from the vault only while the settings show it, and again when Obsidian reports a
 * change (docs/adr/0016)
 */
export function notesWithFormatIn(
  granularity: IGranularity,
  format: string,
  settings: Pick<ISettings, "periods" | "localeSettings">,
): string[] {
  const vault = vaultSource();
  const { folder } = settings.periods[granularity];
  return notesWithFormat(vault.markdownFiles(), granularity, { folder, format }, periodRulesFor(settings));
}

/**
 * Calendared: a missing template is read as empty and not created, matching the settings' "Template file not found"
 * (upstream created an empty file there). The message names the note's period, not always "daily"
 */
export async function getTemplateInfo(
  template: string,
  granularity: IGranularity,
): Promise<string> {
  const app = PluginService.getPlugin()?.app;

  // Calendared: ".md" is added as in the settings, also to a path saved without it (docs/spec/overview.md)
  const normalizedPath = templateFilePath(template);
  if (!normalizedPath) {
    return "";
  }

  const abstractFile = app?.vault.getAbstractFileByPath(normalizedPath);
  if (!(abstractFile instanceof TFile)) {
    return "";
  }

  try {
    return await app?.vault.cachedRead(abstractFile) || "";
  } catch (err) {
    const what = `${getPeriodicityFromGranularity(granularity)} note template`;
    console.error(`Failed to read the ${what} '${normalizedPath}'`, err);
    new Notice(`Failed to read the ${what}`);
    return "";
  }
}
