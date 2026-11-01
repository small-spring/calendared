// Calendared: sticker button in the header of open periodic notes, next to the reading-view icon
// (Obsidian's `view.addAction`), plus the helpers shared with the commands and the right-click menu.
// See docs/spec/stickers.md.
import { PluginService } from "@/app-service";
import { periodicNoteOf } from "@/io/validation";
import { openStickerPicker } from "@/ui/sticker-picker";
import { getNoteSticker, removeSticker } from "@/ui/utils/emoji-picker";
import { settingsStore } from "@/settings";
import { MarkdownView, TFile, setIcon } from "obsidian";
import { get } from "svelte/store";
import { ViewActions } from "./view-actions";

/** also shown next to the setting that turns the button on and off */
export const STICKER_BUTTON_ICON = "smile-plus";

export function isPeriodicNote(file: TFile | null | undefined): file is TFile {
  return !!file && !!periodicNoteOf(file);
}

export class StickerActions {
  /** the header button added to each Markdown view showing a periodic note */
  private buttons = new ViewActions();

  /** Add, update or remove the button on every open Markdown view to match the note it shows */
  refresh() {
    const app = PluginService.getPlugin()?.app;
    if (!app) return;

    const { stickersEnabled, stickerHeaderButton } = get(settingsStore);
    if (!stickersEnabled || !stickerHeaderButton) {
      this.removeAll();
      return;
    }

    for (const view of this.buttons.openViews(app)) {
      const file = view.file;

      // unlike Open now, the button is only on periodic notes
      if (!isPeriodicNote(file)) {
        this.buttons.remove(view);
        continue;
      }

      // the click reads `view.file` then, so the button follows the note when the tab switches notes
      // Calendared: named like the command and the calendar's menu item ("Manage sticker"); it was "Add sticker"
      const button = this.buttons.ensure(view, STICKER_BUTTON_ICON, "Manage sticker", (event) => {
        // the picker closes on any click outside it; keep this click from reaching that listener
        event.stopPropagation();
        if (isPeriodicNote(view.file)) {
          openStickerPicker(view.file, (event.currentTarget as Element | null) ?? view.containerEl);
        }
      });

      // metadata updates arrive on nearly every keystroke: only redraw when the sticker actually changed
      const sticker = getNoteSticker(file);
      const shown = sticker?.emoji ?? "";
      if (button.dataset.sticker === shown && button.hasChildNodes()) continue;
      button.dataset.sticker = shown;

      if (sticker) {
        // show the sticker itself, so you can tell at a glance whether the note has one
        button.empty();
        button.createSpan({ text: sticker.emoji, cls: "pnc-sticker-action-emoji" });
        button.setAttribute("aria-label", `Manage sticker (${sticker.emoji})`);
      } else {
        setIcon(button, STICKER_BUTTON_ICON);
        button.setAttribute("aria-label", "Manage sticker");
      }
    }
  }

  /** The header button of the active view, if it has one (used as the picker's anchor for the command) */
  getActiveButton(): HTMLElement | undefined {
    const view = PluginService.getPlugin()?.app.workspace.getActiveViewOfType(MarkdownView);
    return view ? this.buttons.get(view) : undefined;
  }

  removeAll() {
    this.buttons.removeAll();
  }
}

export { getNoteSticker, openStickerPicker, removeSticker };
