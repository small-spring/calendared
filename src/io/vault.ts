import { normalizePath, Notice, TFile } from "obsidian";
import { IGranularity } from "./types";
import { normalizePeriodSettings } from "./settings";
import { stickerFrom, type TSticker } from "@/stickers";
import { vaultSource } from "./vault-source";
import { notesWithFormat } from "./notes-by-format";
import { type ISettings, settingsStore } from "@/settings";
import { get } from "svelte/store";
import { PluginService } from "@/app-service";
import type { IFoldInfo } from "./types";
import { join, notePath } from './note-path';
import { periodRulesFor } from '@/periods';


export type TFileData = {
  file: TFile | null;
  sticker: TSticker | null
}

export function basename(fullPath: string): string {
  let base = fullPath.substring(fullPath.lastIndexOf("/") + 1);
  if (base.lastIndexOf(".") != -1)
    base = base.substring(0, base.lastIndexOf("."));
  return base;
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

async function ensureTemplateExists(path: string) {
  // create directory if it doesn't exist
  await ensureFolderExists(path);

  // create file if it doesnt exist
  if (!PluginService.getPlugin()?.app.vault.getAbstractFileByPath(path)) {
    await PluginService.getPlugin()?.app.vault.create(path, "");
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
  const { settings: { format, folder } } = normalizePeriodSettings(granularity, periods);
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
  const { settings: { folder } } = normalizePeriodSettings(granularity, settings.periods);
  return notesWithFormat(vault.markdownFiles(), granularity, { folder, format }, periodRulesFor(settings));
}

export async function getTemplateInfo(
  template: string
): Promise<[string, IFoldInfo | null]> {
  const app = PluginService.getPlugin()?.app;

  const normalizedPath = normalizePath(template);
  if (normalizedPath === "/") {
    return Promise.resolve(["", null]);
  }
  await ensureTemplateExists(normalizedPath);

  try {
    // get First file matching given normalizedPath
    const abstractFile = app?.vault.getAbstractFileByPath(normalizedPath);

    let templateFile = null;
    let contents = "";
    if (abstractFile instanceof TFile) {
      templateFile = abstractFile
      contents = await app?.vault.cachedRead(templateFile) || "";
    }

    const foldInfo = PluginService.getPlugin()?.app.foldManager.load(templateFile) ?? null;
    return [contents, foldInfo];
  } catch (err) {
    console.error(
      `Failed to read the daily note template '${normalizedPath}'`,
      err
    );
    new Notice("Failed to read the daily note template");
    return ["", null];
  }
}

export async function modifyFile(file: TFile, updatedContent: string) {
  const app = PluginService.getPlugin()?.app
  const activeEditor = app?.workspace.activeEditor
  const editor = activeEditor?.editor
  if (editor && activeEditor.file === file) {
    editor.setValue(updatedContent)
  } else {
    await app?.vault.process(file, (crrContent) => updatedContent)
  }
}
