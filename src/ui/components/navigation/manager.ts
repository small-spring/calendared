import { ItemView, MarkdownView, Platform, TFile, WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import { get } from "svelte/store";

import { PluginService } from "@/app-service";
import { periodicNoteOf } from "@/io/validation";
import { showsOn } from "@/navigation";
import { settingsStore } from "@/settings";
import Navigation from "./Navigation.svelte";
import { NavigationSync } from "./sync";

/**
 * Calendared: puts each note tab's breadcrumbs and mini calendar in place (which ones is decided by NavigationSync,
 * docs/adr/0017, 0031). Lives while the plugin is loaded; the settings decide which tabs get them
 */
export default class NavigationManager {
  static instance: NavigationManager | null = null;

  private tabs = new NavigationSync<WorkspaceLeaf, Record<string, unknown>, TFile>({
    mount: (leaf, props) =>
      mount(Navigation, {
        target: leaf.view.containerEl,
        // between the tab's header and its note, so on desktop the bar pushes the note down instead of covering it
        anchor: leaf.view instanceof ItemView ? leaf.view.contentEl : undefined,
        props: { ...props, isSide: isInSidebar(leaf) },
      }),
    unmount: (component) => void unmount(component),
    read: (file) => {
      const note = periodicNoteOf(file);
      return { isPeriodic: !!note, granularity: note?.granularity ?? null, date: note?.date ?? null };
    },
  });

  /**
   * Bring every note tab in line with its note: on opening a note, changing tabs or panes, renaming, and when the
   * settings change which notes show them
   */
  public syncAll() {
    const app = PluginService.getPlugin()?.app;
    if (!app) return;

    const { breadcrumbs, miniCalendar } = get(settingsStore);
    const crumbs = showsOn(breadcrumbs, Platform.isPhone);
    const mini = showsOn(miniCalendar, Platform.isPhone);
    const show = {
      periodic: crumbs || mini,
      other: (crumbs && breadcrumbs.onOtherNotes) || (mini && miniCalendar.onOtherNotes),
    };

    const tabs = app.workspace.getLeavesOfType("markdown").map((leaf) => ({
      leaf,
      target: leaf.view.containerEl,
      // a tab not loaded yet (deferred) has no MarkdownView; it is picked up when it loads (layout-change)
      file: leaf.view instanceof MarkdownView ? leaf.view.file : null,
    }));
    this.tabs.sync(tabs, show);
  }

  static create() {
    NavigationManager.instance ??= new NavigationManager();
    return NavigationManager.instance;
  }

  static destroy() {
    NavigationManager.instance?.tabs.clear();
    NavigationManager.instance = null;
  }
}

/** A tab in the left or right sidebar (on phones, a drawer) */
function isInSidebar(leaf: WorkspaceLeaf): boolean {
  const split = (leaf as WorkspaceLeaf & { containerEl?: HTMLElement }).containerEl?.closest(
    Platform.isPhone ? ".workspace-drawer" : ".workspace-split",
  );
  return !!split && (split.classList.contains("mod-left") || split.classList.contains("mod-right"));
}
