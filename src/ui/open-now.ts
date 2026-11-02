// Calendared: "Open now" opens now's note in the finest period in use (today's, if days are used) and moves the
// calendar to today (docs/adr/0030). It sits in every note's header (like the sticker button, `view.addAction`) and
// in the calendar's header, where it replaces upstream's ⌖ ("go to current month")
import { getIcon, type TFile } from "obsidian";
import { get } from "svelte/store";
import { ViewActions } from "./view-actions";

import { PluginService } from "@/app-service";
import { openCurrentNote } from "@/io";
import { periodicNoteOf } from "@/io/validation";
import { finestEnabled, isNowNote } from "@/navigation";
import { settingsStore, type ISettings } from "@/settings";
import { enabledPeriods } from "@/settings/period-switch";
import { displayedDateStore, refreshToday, todayStore, yearsRanges } from "@/stores";
import { periodRulesFor } from "@/periods";

/** calendar-clock ("now", not "today"); an older Obsidian without it in its Lucide set gets the plain clock */
export function openNowIcon(): string {
  return getIcon("calendar-clock") ? "calendar-clock" : "clock";
}


/** Whether `file` (the open note) is the note Open now opens. Svelte components pass the stores' values to react to them */
export function isNowNoteFile(
  file: TFile | null | undefined,
  settings: ISettings = get(settingsStore),
  today: moment.Moment = get(todayStore),
): boolean {
  if (!file) return false;
  const note = periodicNoteOf(file);
  return isNowNote(note, enabledPeriods(settings.periods), today, periodRulesFor(settings));
}

/** Open (or create, after the usual confirmation) now's note, and show today in the calendar */
export function openNow() {
  const app = PluginService.getPlugin()?.app;
  if (!app) return;

  const today = refreshToday();
  const granularity = finestEnabled(enabledPeriods(get(settingsStore).periods));
  // the calendar moves to today's month itself: a week or quarter note would only bring it to the period's first month
  yearsRanges.update((values) => ({
    ...values,
    crrRangeIndex: values.ranges.findIndex((range) => range === values.todayRange),
  }));
  displayedDateStore.set(today.clone());
  if (isNowNoteFile(app.workspace.getActiveFile())) return;
  openCurrentNote(granularity, { leaf: app.workspace.getLeaf(false) }).catch(console.error);
}

export class OpenNowActions {
  /** the header button added to each Markdown view */
  private buttons = new ViewActions("open-now");

  /** Add or remove the button on every open Markdown view, and dim it where now's note is already open */
  refresh() {
    const app = PluginService.getPlugin()?.app;
    if (!app) return;

    if (!get(settingsStore).openNowHeaderButton) {
      this.removeAll();
      return;
    }

    // on every note, periodic or not
    const icon = openNowIcon();
    for (const view of this.buttons.openViews(app)) {
      const button = this.buttons.ensure(view, icon, "Open now", () => {
        // opens in this tab: make it the active one first, so a click on a background pane's header goes there
        app.workspace.setActiveLeaf(view.leaf, { focus: true });
        openNow();
      });
      button.toggleClass("calendared-open-now-is-now", isNowNoteFile(view.file));
    }
  }

  removeAll() {
    this.buttons.removeAll();
  }
}
