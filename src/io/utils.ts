import { granularities } from "@/constants";
import { settingsStore, TFormat } from "@/settings";
import { normalizePath, Notice, TFile, TFolder, Vault } from "obsidian";
import { get } from "svelte/store";
import { getPeriodicityFromGranularity } from "./parse";
import { getNormalizedPeriodSettings } from "./settings";
import { type IGranularity } from "./types";
import { isValidPeriodicNote } from "./validation";
import { PluginService } from "@/app-service";
import { genNoticeFragment } from "@/ui/utils";

export function storeAllVaultPeriodicFilepaths(
  firstRun = false,
  customGranularities = granularities as unknown as IGranularity[],
  customFormats?: Record<string, TFormat>,
) {
  const uniqueFolders: Record<string, IGranularity[]> = {};

  customGranularities.forEach((g) => {
    const { settings: periodSettings } = getNormalizedPeriodSettings(g)
    const periodFolder = periodSettings.folder;

    if (!uniqueFolders[periodFolder]) {
      uniqueFolders[periodFolder] = []
    }
    uniqueFolders[periodFolder].push(g)
  })

  settingsStore.update((s) => {
    if (firstRun) {
      s.filepaths = {};
      s.filepathsByFormatValue = {};
    }

    Object.entries(uniqueFolders).forEach(([uniqueFolder, customGranularities]) => {
      try {
        const notesFolder = PluginService.getPlugin()?.app.vault.getAbstractFileByPath(normalizePath(uniqueFolder));

        if (!notesFolder || !(notesFolder instanceof TFolder)) {
          return new Notice(genNoticeFragment([
            ['Warning: Missing or invalid folders for these periods: '],
            [customGranularities.map((g) => getPeriodicityFromGranularity(g)).join(', '), 'u-pop'],
            ['. \n'],
            ['1. Check your folder paths in plugin settings. \n'],
            ['2. Ensure they exist as actual folders. \n'],
            ['3. Restart Obsidian to apply changes.']
          ]), 10000);
        }

        Vault.recurseChildren(notesFolder, (file) => {
          if (file instanceof TFile) {
            if (file.extension !== 'md') return;

            if (isBackupPath(file.path)) return;

            const { isValid, format } = isValidPeriodicNote(file.basename, customGranularities, customFormats);

            if (typeof isValid === "boolean") {
              s.filepaths[file.path] = format.value;
              if (!(format.value in s.filepathsByFormatValue)) {
                s.filepathsByFormatValue[format.value] = {}
              }
              s.filepathsByFormatValue[format.value]![file.path] = file.path;
            }
          }
        });

      } catch (error) {
        if (typeof error === 'string') {
          new Notice(error)
        };
      }
    })

    return s
  })
}

export function getStartupNoteGranularity() {
  for (const granularity of granularities) {
    const settings = get(settingsStore).periods[granularity]
    if (settings.enabled && settings.openAtStartup) {
      return granularity
    }
  }
}

export function trim(s: string) {
  return s
    .trim()
    .split(" ")
    .filter((s) => s.trim())
    .join(" ");
}

export function isBackupPath(path: string): boolean {
  return path.split("/").some((segment) => {
    if (segment.startsWith("periodic-notes-BACKUP-")) {
      const timestamp = segment.replace("periodic-notes-BACKUP-", "");
      return window.moment(timestamp, "YYYYMMDDHHmmss", true).isValid();
    }
    return false;
  });
}
