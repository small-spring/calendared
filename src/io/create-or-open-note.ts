import { settingsStore } from "@/settings";
import { createConfirmationDialog } from "@/ui/modals/confirmation";
import { Notice, TFile, WorkspaceLeaf } from "obsidian";
import { get } from "svelte/store";
import CreateNote from "./CreateNote.svelte";
import { getPeriodicityFromGranularity, replaceTemplateContents } from "./parse";
import { type IGranularity } from "./types";
import { ensureFolderExists, getNotePath, getTemplateInfo } from "./vault";
import { noteNameOf } from "./note-path";
import { PluginService } from "@/app-service";
import { turnedOffMessage } from "@/period-words";
import { periodRulesFor, periodStart } from "@/periods";
import { refreshToday } from "@/stores/dates";

export async function createOrOpenNote({
  leaf,
  date,
  granularity,
  confirmBeforeCreateOverride = get(settingsStore).shouldConfirmBeforeCreate,
}: {
  leaf: WorkspaceLeaf | null;
  date: moment.Moment;
  granularity: IGranularity;
  confirmBeforeCreateOverride?: boolean;
}) {
  const normalizedPath = getNotePath(granularity, date);
  // Calendared: the name the note gets, not moment's (moment writes calendar quarters and years; docs/adr/0039)
  const filename = noteNameOf(normalizedPath);

  async function openFile(file: TFile | undefined | null) {
    if (file) {
      // Calendared: the calendar's selection follows from opening the note (docs/adr/0015)
      await leaf?.openFile(file);
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
      return new Notice(turnedOffMessage(granularity));
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

/**
 * Calendared: open (or create) the note of the period that contains today, for the commands, startup and Open now.
 * Today is read from the clock first, so all of them and the calendar agree on it (docs/adr/0030). The date passed on is
 * the period's first day, so a template's {{date}} is the same however the note is made (docs/adr/0039)
 */
export function openCurrentNote(
  granularity: IGranularity,
  { leaf, confirmBeforeCreateOverride }: { leaf: WorkspaceLeaf | null; confirmBeforeCreateOverride?: boolean },
) {
  const date = periodStart(granularity, refreshToday(), periodRulesFor(get(settingsStore)));
  return createOrOpenNote({ leaf, date, granularity, confirmBeforeCreateOverride });
}

export async function createNote(granularity: IGranularity, date: moment.Moment) {
  const { templatePath, format } = get(settingsStore).periods[granularity];

  const normalizedPath = getNotePath(granularity, date);
  await ensureFolderExists(normalizedPath);
  const templateContents = await getTemplateInfo(templatePath, granularity);

  try {
    const file = await PluginService.getPlugin()?.app.vault.create(
      normalizedPath,
      replaceTemplateContents(granularity, date, format, templateContents, periodRulesFor(get(settingsStore)))
    );
    if (!file || !(file instanceof TFile)) return;

    return file;
  } catch (err) {
    console.error(`Failed to create file: '${normalizedPath}'`, err);
    new Notice(`Failed to create file: '${normalizedPath}'`);

    return null
  }
}
