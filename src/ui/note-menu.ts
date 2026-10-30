// Calendared: the right-click menu of the calendar's dates and titles (an Obsidian `Menu`). Upstream wrapped it in a
// popover singleton that tracked whether it was open, though Obsidian's menu closes itself
import { PluginService } from "@/app-service";
import { TFileData, type IGranularity } from "@/io";
import { settingsStore } from "@/settings";

import { Menu, Platform, type TFile } from "obsidian";
import { get } from "svelte/store";
import { eventHandlers, isControlPressed } from "./utils";
import { openStickerPicker } from "./sticker-picker";

export type NoteMenuParams = {
  event: MouseEvent,
  fileData: TFileData,
  date: moment.Moment,
  granularity?: IGranularity,
}

/** The `source` other plugins see in the `file-menu` event for this menu */
const MENU_SOURCE = "calendared";

let openMenu: Menu | null = null;

export function openNoteMenu({ event, fileData, date, granularity }: NoteMenuParams) {
  const menu = new Menu();

  if (fileData.file) {
    addNoteItems(menu, fileData.file);
  } else if (date && granularity) {
    menu.addItem((item) => {
      item
        .setTitle("Create note")
        .setIcon("document")
        .onClick(() => {
          eventHandlers.onClick({
            date,
            granularity,
            createNewSplitLeaf: isControlPressed(event)
          }).catch(console.error);
        });
    });
  }

  menu.onHide(() => {
    if (openMenu === menu) openMenu = null;
  });
  openMenu = menu;
  menu.showAtPosition(event);
}

/** Close the menu if it is open (when the plugin is turned off) */
export function closeNoteMenu() {
  openMenu?.hide();
  openMenu = null;
}

function addNoteItems(menu: Menu, file: TFile) {
  (menu as Menu & { addSections: (sections: string[]) => void }).addSections(["title", "open", "action-primary", "action", "info", "view", "system", "", "danger"]);

  if (Platform.isPhone) {
    menu.addItem((item) =>
      item.setSection("title")
        .setIcon("lucide-file")
        .setTitle(file.name)
        .setIsLabel(true)
    );
  }

  // Open in new tab
  menu.addItem((item) =>
    item.setSection("open")
      .setTitle("Open in new tab")
      .setIcon("lucide-file-plus")
      .onClick(() => {
        PluginService.getPlugin()?.app.workspace.openLinkText(file.path, "", "tab").catch(console.error);
      })
  );

  // Open to the right
  menu.addItem((item) =>
    item.setSection("open")
      .setTitle("Open to the right")
      .setIcon("lucide-separator-vertical")
      .onClick(() => {
        PluginService.getPlugin()?.app.workspace.openLinkText(file.path, "", "split").catch(console.error);
      })
  );

  // Make a copy
  menu.addItem((item) =>
    item.setSection("action")
      .setTitle("Make a copy")
      .setIcon("lucide-files")
      .onClick(() => {
        const plugin = PluginService.getPlugin()
        if (!plugin) return;

        const newPath = plugin.app.vault.getAvailablePath(file.path, file.extension);
        plugin.app.vault.copy(file, newPath).then((newFile) => {
          plugin.app.workspace.openLinkText(newFile.path, "", "tab").catch(console.error);
        }).catch(console.error);
      })
  );

  // Calendared: "Manage sticker" only in this menu, where it's the way to sticker a day without opening its note.
  // Upstream added "Add sticker" to every file menu (file explorer, the note's "…" menu), which are shared and already
  // long; the note header button and the "Manage sticker" command cover those
  if (get(settingsStore).stickersEnabled) {
    menu.addItem((item) =>
      item.setSection("action")
        .setTitle("Manage sticker")
        .setIcon("lucide-smile-plus")
        .onClick((evt) => {
          evt.preventDefault()
          evt.stopPropagation()

          const { dom, bgEl } = menu as Menu & { dom?: Element, bgEl?: Element };
          const anchorEl = dom || bgEl;
          if (anchorEl) openStickerPicker(file, anchorEl);
        })
    );
  }

  // Delete
  menu.addItem((item) =>
    item.setSection("danger")
      .setTitle("Delete")
      .setIcon("lucide-trash-2")
      .setWarning(true)
      .onClick(() => {
        const plugin = PluginService.getPlugin();
        if (plugin) {
          plugin.app.fileManager.promptForDeletion(file).catch(console.error);
        }
      })
  );

  PluginService.getPlugin()?.app.workspace.trigger("file-menu", menu, file, MENU_SOURCE);
}
