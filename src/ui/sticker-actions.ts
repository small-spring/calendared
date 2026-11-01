// Calendared: sticker button in the header of open periodic notes, next to the reading-view icon
// (Obsidian's `view.addAction`), plus the helpers shared with the commands and the right-click menu.
// See docs/spec/stickers.md.
import { PluginService } from "@/app-service";
import { periodicNoteOf } from "@/io/validation";
import { openStickerPicker } from "@/ui/sticker-picker";
import { getSticker, removeSticker } from "@/ui/utils/emoji-picker";
import { settingsStore } from "@/settings";
import { MarkdownView, TFile, setIcon } from "obsidian";
import { get } from "svelte/store";

/** also shown next to the setting that turns the button on and off */
export const STICKER_BUTTON_ICON = "smile-plus";

export function isPeriodicNote(file: TFile | null | undefined): file is TFile {
  return !!file && !!periodicNoteOf(file);
}

export function getNoteSticker(file: TFile) {
  return getSticker(PluginService.getPlugin()?.app.metadataCache.getFileCache(file));
}

export class StickerActions {
  /** the header button added to each Markdown view showing a periodic note */
  private buttons = new Map<MarkdownView, HTMLElement>();

  /** Add, update or remove the button on every open Markdown view to match the note it shows */
  refresh() {
    const app = PluginService.getPlugin()?.app;
    if (!app) return;

    const { stickersEnabled, stickerHeaderButton } = get(settingsStore);
    if (!stickersEnabled || !stickerHeaderButton) {
      this.removeAll();
      return;
    }

    const views = new Set<MarkdownView>();
    for (const leaf of app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView) views.add(leaf.view);
    }

    // views that were closed
    for (const [view, button] of this.buttons) {
      if (!views.has(view)) {
        button.remove();
        this.buttons.delete(view);
      }
    }

    for (const view of views) {
      const file = view.file;
      let button = this.buttons.get(view);

      if (!isPeriodicNote(file)) {
        button?.remove();
        this.buttons.delete(view);
        continue;
      }

      if (!button) {
        // the click reads `view.file` then, so the button follows the note when the tab switches notes
        // Calendared: named like the command and the calendar's menu item ("Manage sticker"); it was "Add sticker"
        button = view.addAction(STICKER_BUTTON_ICON, "Manage sticker", (event) => {
          // the picker closes on any click outside it; keep this click from reaching that listener
          event.stopPropagation();
          if (isPeriodicNote(view.file)) {
            openStickerPicker(view.file, (event.currentTarget as Element | null) ?? view.containerEl);
          }
        });
        this.buttons.set(view, button);
      }

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
    for (const button of this.buttons.values()) button.remove();
    this.buttons.clear();
  }
}

export { openStickerPicker, removeSticker };
