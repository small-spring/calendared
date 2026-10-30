import { settingsStore } from "@/settings";
import { createConfirmationDialog } from "@/ui/modals/confirmation";
import { Notice, TFile, WorkspaceLeaf } from "obsidian";
import { get } from "svelte/store";
import CreateNote from "./CreateNote.svelte";
import { getPeriodicityFromGranularity, replaceTemplateContents } from "./parse";
import { getNormalizedPeriodSettings } from "./settings";
import { type IGranularity } from "./types";
import { ensureFolderExists, getNotePath, getTemplateInfo } from "./vault";
import { PluginService } from "@/app-service";
import { capitalize } from "@/utils";
import { weekSchemeFor } from "@/weeks";

export async function createOrOpenNote({
  leaf,
  date,
  granularity,
  openState,
  confirmBeforeCreateOverride = get(settingsStore).shouldConfirmBeforeCreate,
}: {
  leaf: WorkspaceLeaf | null;
  date: moment.Moment;
  openState?: Record<string, unknown>;
  granularity: IGranularity;
  confirmBeforeCreateOverride?: boolean;
}) {
  const { settings: { selectedFormat } } = getNormalizedPeriodSettings(granularity);

  const filename = date.format(selectedFormat.value);
  const normalizedPath = getNotePath(granularity, date);

  // console.log("🎉🎉🎉 [createOrOpenNote()] 🎉🎉🎉");
  // console.table({
  //     granularity,
  //     selectedFormat,
  //     filename,
  //     normalizedPath,
  //     date,
  //     formattedDate: date.format("YYYY-MM-DD, [W]W, [w]w")
  // })

  async function openFile(file: TFile | undefined | null) {
    if (file) {
      // Calendared: the calendar's selection follows from opening the note (docs/state.md, ADR-S1)
      await leaf?.openFile(file, openState);
    }
  }

  let file = PluginService.getPlugin()?.app.vault.getAbstractFileByPath(normalizedPath)
  if (file && file instanceof TFile) {
    await openFile(file);
  } else if (file && !(file instanceof TFile)) {
    return new Notice(`Not a file: ${normalizedPath}`);
  } else {
    const periodicity = getPeriodicityFromGranularity(granularity);

    // Calendared: upstream created the note even when its period was disabled in settings.
    // Existing notes still open (above); only creation is blocked.
    if (!get(settingsStore).periods[granularity].enabled) {
      return new Notice(`${capitalize(periodicity)} notes are turned off in settings`);
    }

    if (confirmBeforeCreateOverride) {
      createConfirmationDialog({
        title: `New ${periodicity} note`,
        text: `File ${filename} does not exist. Would you like to create it?`,
        note: {
          Component: CreateNote,
          props: {
            granularity
          }
        },
        cta: 'Create',
        onAccept: async (dontAskAgain) => {
          const newFile = await createNote(granularity, date);
          await openFile(newFile);

          if (dontAskAgain) {
            settingsStore.update((settings) => ({
              ...settings,
              shouldConfirmBeforeCreate: false
            }));
          }
        }
      });
    } else {
      const newFile = await createNote(granularity, date);
      await openFile(newFile);
    }
  }
}

export async function createNote(granularity: IGranularity, date: moment.Moment) {
  const { settings: { templatePath, selectedFormat } } = getNormalizedPeriodSettings(granularity);

  const normalizedPath = getNotePath(granularity, date);
  await ensureFolderExists(normalizedPath);
  const [templateContents] = await getTemplateInfo(templatePath);

  try {
    const file = await PluginService.getPlugin()?.app.vault.create(
      normalizedPath,
      replaceTemplateContents(date, selectedFormat.value, templateContents, weekSchemeFor(get(settingsStore).localeSettings))
    );
    if (!file || !(file instanceof TFile)) return;

    return file;
  } catch (err) {
    console.error(`Failed to create file: '${normalizedPath}'`, err);
    new Notice(`Failed to create file: '${normalizedPath}'`);

    return null
  }
}
