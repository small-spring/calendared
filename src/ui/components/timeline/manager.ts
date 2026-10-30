import { MarkdownView, Platform, TFile, WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import { get } from "svelte/store";

import { PluginService } from "@/app-service";
import { isValidPeriodicNote } from "@/io/validation";
import { settingsStore } from "@/settings";
import Timeline from "./Timeline.svelte";
import { TimelineSync } from "./sync";

/**
 * Calendared: puts each note tab's timeline in place (which one is decided by TimelineSync, docs/adr/0017).
 * Exists while the timeline is enabled in the settings
 */
export default class TimelineManager {
  static instance: TimelineManager | null = null;

  private timelines = new TimelineSync<WorkspaceLeaf, Record<string, unknown>, TFile>({
    mount: (leaf, props) =>
      mount(Timeline, {
        target: leaf.view.containerEl,
        props: { ...props, isSide: isInSidebar(leaf) },
      }),
    unmount: (component) => void unmount(component),
    read: (file) => {
      const { isValid, granularity, date } = isValidPeriodicNote(file.basename);
      const isPeriodic = typeof isValid === "boolean" && !!date && !!granularity;
      return { isPeriodic, granularity: isPeriodic ? granularity : null, date: isPeriodic ? date : null };
    },
  });

  /** Bring every note tab's timeline in line with its note: on opening a note, changing tabs or panes, renaming */
  public syncAll() {
    const app = PluginService.getPlugin()?.app;
    if (!app) return;

    const tabs = app.workspace.getLeavesOfType("markdown").map((leaf) => ({
      leaf,
      target: leaf.view.containerEl,
      // a tab not loaded yet (deferred) has no MarkdownView; it is picked up when it loads (layout-change)
      file: leaf.view instanceof MarkdownView ? leaf.view.file : null,
    }));
    this.timelines.sync(tabs, get(settingsStore).timeline);
  }

  /** Mount every timeline again, after a timeline setting changed */
  public restartAll() {
    this.timelines.clear();
    this.syncAll();
  }

  /**
    * only instantiates TimelineManager if enabled
  */
  static create() {
    if (!TimelineManager.instance && get(settingsStore).timeline.enabled) {
      TimelineManager.instance = new TimelineManager()
    }
    return TimelineManager.instance
  }

  static destroy() {
    if (TimelineManager.instance) {
      TimelineManager.instance.timelines.clear()
      TimelineManager.instance = null
    }
  }
}

/** A tab in the left or right sidebar (on phones, a drawer), where the timeline sits higher */
function isInSidebar(leaf: WorkspaceLeaf): boolean {
  const split = (leaf as WorkspaceLeaf & { containerEl?: HTMLElement }).containerEl?.closest(
    Platform.isPhone ? ".workspace-drawer" : ".workspace-split",
  );
  return !!split && (split.classList.contains("mod-left") || split.classList.contains("mod-right"));
}
