import { DEFAULT_SETTINGS, REMOVED_PERIOD_SETTINGS, REMOVED_SETTINGS, settingsStore, SettingsTab, type ISettings } from '@/settings';
import { InvalidFormat, ViewManager } from '@/ui';
import { MarkdownView, Menu, Notice, Plugin, TAbstractFile, TFile, WorkspaceLeaf, WorkspaceRoot } from 'obsidian';
import { mount, type SvelteComponent } from 'svelte';
import { get } from 'svelte/store';
import { PluginService } from './app-service';
import { CALENDAR_LUCIDE_ICON, granularities, LEAF_TYPE } from './constants';
import { createOrOpenNote, getFileData, getStartupNoteGranularity, initVaultSource, isBackupPath } from './io';
import { getPeriodicityFromGranularity } from './io/parse';
import type { IGranularity } from './io/types';
import { isValidPeriodicNote } from './io/validation';
import { overlapsMonth, rangeOfPeriod, shiftPeriod } from './periods';
import { toSupportedWeekStart, weekSchemeFor } from './weeks';
import {
  displayedDateStore,
  setupLocale,
  themeStore,
} from './stores';
import TimelineManager from './ui/components/timeline/manager';
import { Popover } from './ui/popovers';
import { getDailyNotesPlugin } from './utils';
import { CalendarView } from './view';
import { initEmojiSearch } from './ui/utils/emoji-locale';
import { getNoteSticker, isPeriodicNote, openStickerPicker, removeSticker, StickerActions } from './ui/sticker-actions';

export default class PeriodicNotesCalendarPlugin extends Plugin {
  popovers: Record<string, SvelteComponent | null> = {};
  popoverAutoUpdateCleanup: (() => void) | null = null;
  /** Calendared: sticker button in the header of periodic notes */
  stickerActions = new StickerActions();

  /**
   * Calendared: upstream left this empty, so popovers mounted on document.body (calendar, sticker picker, ...)
   * and timelines stayed in the page after the plugin was turned off. On the next load the new popovers looked
   * themselves up by id and got the stale ones from the previous load instead.
   */
  onunload() {
    Popover.stickerSingleton?.cleanup();
    Popover.fileMenuSingleton?.cleanup();
    Popover.baseSingleton?.cleanup();
    Popover.cleanup();
    TimelineManager.destroy();
    this.stickerActions.removeAll();
  }

  async onload() {
    PluginService.init(this);
    // Calendared: the UI reads notes and stickers through the vault source (docs/state.md, ADR-S2)
    initVaultSource(this.app);

    await this.loadSettings();
    this.registerEvents()

    // theme
    themeStore.set(this.getTheme());

    // plugins
    await getDailyNotesPlugin()

    // sub settings
    const unsubSettingsStore = settingsStore.subscribe(this.saveSettings.bind(this))
    this.register(unsubSettingsStore);
    // Calendared: show/hide the header sticker buttons when the sticker settings change
    this.register(settingsStore.subscribe(() => this.stickerActions.refresh()));

    this.addSettingTab(new SettingsTab());

    setupLocale()
    // Calendared: the picker's search in Obsidian's language, from keywords downloaded on request (emoji-search.ts)
    initEmojiSearch(this.app, this.manifest.dir ?? `${this.app.vault.configDir}/plugins/${this.manifest.id}`).catch(console.error);
    this.handleRibbon();

    // register view
    // register a view under a specific leaf type so obsidian knows to render it when calling `setViewState` with LEAF_TYPE
    this.registerView(LEAF_TYPE, (leaf) => new CalendarView(leaf));

    // Commands
    this.addCommand({
      id: 'toggle-calendar-view',
      name: 'Toggle calendar interface',
      callback: () => {
        this.toggleView().catch(console.error);
      }
    });

    // Calendared: named after the period ("today's", "this week's"); ids are upstream's so existing hotkeys keep working
    const currentPeriodNames: Record<IGranularity, string> = {
      day: "Open today's note",
      week: "Open this week's note",
      month: "Open this month's note",
      quarter: "Open this quarter's note",
      year: "Open this year's note",
    };
    granularities.forEach((granularity) => {
      this.addCommand({
        id: `create-current-${getPeriodicityFromGranularity(granularity)}-note`,
        name: currentPeriodNames[granularity],
        // Calendared: upstream used `callback`. With `checkCallback`, Obsidian asks first (checking = true)
        // and hides the command while its period is disabled in settings
        checkCallback: (checking) => {
          if (!get(settingsStore).periods[granularity].enabled) return false;
          if (checking) return true;

          const leaf = this.app.workspace.getLeaf(false);
          const date = window.moment().clone().startOf(granularity);
          createOrOpenNote({ leaf, date, granularity, confirmBeforeCreateOverride: false }).catch(console.error);
          return true;
        }
      });
    });

    // Calendared: step from the open periodic note to the one before / after it in the same period
    // (a monthly note goes to the previous / next month). Only opens existing notes (shows a notice otherwise).
    // Hidden from the palette unless a periodic note is open
    (['previous', 'next'] as const).forEach((pos) => {
      this.addCommand({
        id: `open-${pos}-note`,
        name: `Open ${pos} periodic note`,
        checkCallback: (checking) => {
          const file = this.app.workspace.getActiveFile();
          if (!file) return false;
          const { granularity, period } = isValidPeriodicNote(file.basename);
          if (!granularity || !period) return false;
          if (checking) return true;

          const weeks = weekSchemeFor(get(settingsStore).localeSettings);
          const targetPeriod = shiftPeriod(period, pos === 'next' ? 1 : -1, weeks);
          const { file: target } = getFileData(granularity, rangeOfPeriod(targetPeriod, weeks)!.start);
          if (target) {
            this.app.workspace.getLeaf(false).openFile(target).catch(console.error);
          } else {
            new Notice(`No ${pos} ${getPeriodicityFromGranularity(granularity)} note`);
          }
          return true;
        }
      });
    });

    // Calendared: sticker commands for the open periodic note (hidden from the palette otherwise)
    this.addCommand({
      id: 'manage-sticker',
      name: 'Manage sticker',
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!get(settingsStore).stickersEnabled || !isPeriodicNote(view?.file)) return false;
        if (checking) return true;

        // open after the command palette has finished handling the click/key that ran this command,
        // otherwise the picker's "click outside closes it" listener catches that click and closes it at once
        const file = view.file;
        const anchorEl = this.stickerActions.getActiveButton() ?? view.containerEl;
        window.setTimeout(() => openStickerPicker(file, anchorEl), 0);
        return true;
      }
    });
    this.addCommand({
      id: 'remove-sticker',
      name: 'Remove sticker',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveViewOfType(MarkdownView)?.file;
        if (!get(settingsStore).stickersEnabled || !isPeriodicNote(file) || !getNoteSticker(file)) return false;
        if (checking) return true;

        removeSticker(file).catch(console.error);
        return true;
      }
    });

    this.app.workspace.onLayoutReady(async () => {
      ViewManager.initView({ active: false });
      TimelineManager.create()?.syncAll();

      // Calendared: when the plugin is enabled while a note is already open, no `file-open` fires,
      // so pick up the current note once here (on app startup this just repeats what `file-open` does)
      this.onFileOpen(this.app.workspace.getActiveFile());
      this.stickerActions.refresh();

      // open note at startup
      const startupNoteGranularity = getStartupNoteGranularity();
      if (startupNoteGranularity) {
        await createOrOpenNote({
          leaf: this.app.workspace.getLeaf(),
          date: window.moment(),
          granularity: startupNoteGranularity,
          confirmBeforeCreateOverride: false,
        });
      }
    });
  }

  async loadSettings() {
    const loadedSettings = (await this.loadData()) as ISettings;
    if (!loadedSettings) {
      await this.saveData(DEFAULT_SETTINGS)
    }

    settingsStore.update((old) => {
      const newSettings = { ...old, ...(loadedSettings || {}) };
      // Calendared: drop the saved settings of removed features
      for (const key of REMOVED_SETTINGS) {
        delete (newSettings as Record<string, unknown>)[key];
      }
      // Calendared: weeks start on Saturday, Sunday or Monday only, and are numbered by a week scheme (docs/periods.md)
      newSettings.localeSettings = {
        ...newSettings.localeSettings,
        weekStartId: toSupportedWeekStart(newSettings.localeSettings.weekStartId),
        weekNumbering: newSettings.localeSettings.weekNumbering ?? "iso",
      };
      const periods = newSettings.periods
      Object.values(periods).forEach((periodSettings) => {
        for (const key of REMOVED_PERIOD_SETTINGS) {
          delete (periodSettings as unknown as Record<string, unknown>)[key];
        }
      })
      Object.entries(periods).forEach(([granularity, periodSettings]) => {
        Object.values(periodSettings.formats).forEach((format) => {
          periods[granularity as IGranularity].formats[format.id].loading = false
        })
      })
      return {
        ...newSettings,
        // reset formats loading state
        periods
      }
    });
  }

  /**
    * Persist settings to data.json file
  * @param newSettings new user settings
  */
  saveSettings(newSettings: ISettings) {
    this.saveData(newSettings).catch(console.error);
  }

  handleRibbon() {
    this.addRibbonIcon(CALENDAR_LUCIDE_ICON, 'Open calendar', () => {
      this.toggleView().catch(console.error);
    });
  }

  async toggleView() {
    /**
     * HTMLElement where View is rendered at
     */
    let leaf = ViewManager.getMainLeaf() as WorkspaceLeaf & { containerEl: HTMLElement; tabHeaderEl: HTMLElement };
    const crrSplitPos = ViewManager.getLeafSplitPosition(leaf);
    /**
     * A split is a container for leaf nodes that slides in when clicking the collapse button, except for the root split (markdown editor). There are three types: left, root, and right.
     */
    const crrSplit = crrSplitPos && this.app.workspace[`${crrSplitPos}Split`];

    if (!leaf) {
      leaf = ViewManager.initView() as WorkspaceLeaf & { containerEl: HTMLElement; tabHeaderEl: HTMLElement };
      const leafActive = leaf.tabHeaderEl.className.includes('is-active');
      if ((crrSplit && 'collapsed' in crrSplit && crrSplit.collapsed) || !leafActive) {
        ViewManager.revealView().catch(console.error);
      }

      return;
    }

    const leafActive = leaf.tabHeaderEl.className.includes('is-active');

    // Scnearios
    // eval root split
    if (crrSplit instanceof WorkspaceRoot) {
      if (leafActive) {
        // a. root split && leaf active
        leaf.view.unload();
        ViewManager.initView({ active: false });
      } else {
        // b. root split && leaf NOT active
        ViewManager.revealView().catch(console.error);
      }

      return;
    }

    // eval left or right split
    // only leftSplit and rightSplit can be collapsed
    if (!crrSplit?.collapsed) {
      if (leafActive) {
        // c. crr split open and leaf active
        crrSplit?.collapse();
      } else {
        // d. crr split open and leaf NOT active
        ViewManager.revealView().catch(console.error);
      }
    } else {
      // e. crr split collapsed
      ViewManager.revealView().catch(console.error);
    }
  }

  public getTheme() {
    return document.body.hasClass('theme-dark') ? 'dark' : 'light'
  }

  registerEvents() {
    this.registerEvent(this.app.workspace.on('file-menu', (menu, file, source) => this.onFileMenu(menu, file, source)))

    this.registerEvent(
      this.app.workspace.on('css-change', () => {
        themeStore.set(this.getTheme())
      })
    )
    this.registerEvent(
      this.app.vault.on('create', (file) => this.onFileCreated(file))
    );
    this.registerEvent(
      this.app.vault.on('rename', (file) => this.onFileRenamed(file))
    );
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => this.onFileOpen(file))
    )
    // Calendared: keep the header sticker buttons in step with the notes shown and their stickers
    this.registerEvent(this.app.workspace.on('file-open', () => this.stickerActions.refresh()))
    this.registerEvent(this.app.workspace.on('layout-change', () => this.stickerActions.refresh()))
    this.registerEvent(this.app.metadataCache.on('changed', () => this.stickerActions.refresh()))
    // Calendared: upstream re-mounted the timeline only on workspace `resize`, so opening another note in the same tab
    // kept the previous note's timeline (e.g. a monthly note's Q1 view on a daily note).
    // Each tab keeps its timeline while it shows the same note (docs/state.md, ADR-S3); tabs opened, closed or moved
    // and renamed notes are picked up too
    this.registerEvent(this.app.workspace.on('file-open', () => TimelineManager.instance?.syncAll()))
    this.registerEvent(this.app.workspace.on('layout-change', () => TimelineManager.instance?.syncAll()))
    this.registerEvent(this.app.vault.on('rename', () => TimelineManager.instance?.syncAll()))
  }

  /**
   * Calendared: keep the displayed month in step with whichever note is open, however it was opened
   * (file explorer, a hotkey, links, switching tabs...). Upstream followed other opens (`syncCalendar`) inside
   * TimelineManager, so nothing happened while the timeline was disabled. The selection needs nothing here: the
   * calendar reads the open note itself (docs/state.md, ADR-S1)
   */
  private onFileOpen(file: TFile | null) {
    if (!file) return;
    const { isValid, date, period } = isValidPeriodicNote(file.basename);
    if (typeof isValid !== "boolean" || !date || !period) return;

    // Calendared: always follow the open note, but only when no day of it is on the displayed month already.
    // Otherwise clicking a year title would jump to January, or a week number to the month the week starts in.
    // `date` is the period's first day (docs/periods.md)
    if (!overlapsMonth(period, get(displayedDateStore), weekSchemeFor(get(settingsStore).localeSettings))) {
      displayedDateStore.set(date);
    }
  }

  private async onFileMenu(_menu: Menu, file: TAbstractFile, source?: string) {
    if (!(file instanceof TFile)) return;

    const menu = _menu as Menu & { dom: Element; bgEl: Element }

    const { isValid, granularity, date } = isValidPeriodicNote(file.basename);
    if (typeof isValid === 'boolean' && date && granularity) {
      // Calendared: "Manage sticker" only in the calendar's own right-click menu ("custom-file-menu", see file-menu.ts),
      // where it's the way to sticker a day without opening its note. Upstream added "Add sticker" to every file menu
      // (file explorer, the note's "…" menu), which are shared and already long; the note header button and the
      // "Manage sticker" command cover those
      if (source === "custom-file-menu" && get(settingsStore).stickersEnabled) menu.addItem((item) =>
        item.setSection("action")
          .setTitle("Manage sticker")
          .setIcon("lucide-smile-plus")
          .onClick((evt) => {
            evt.preventDefault()
            evt.stopPropagation()

            if (menu.dom || menu.bgEl) {
              openStickerPicker(file, menu.dom || menu.bgEl)
            }
          })
      );
    }
  }

  /**
   * Calendared: tell when a note is named like a periodic note but with a format that has an error. Upstream also kept
   * a list of the vault's periodic notes in the settings (data.json) up to date here; the views and the settings now
   * read the vault itself (docs/state.md, ADR-S2)
   */
  private onFileCreated(file: TAbstractFile) {
    if (!(file instanceof TFile)) return;
    if (!this.app.workspace.layoutReady) return;
    if (file.extension !== 'md' || isBackupPath(file.path)) return;

    this.noticeIfInvalidFormat(file);
  }

  private onFileRenamed(renamedFile: TAbstractFile) {
    if (!(renamedFile instanceof TFile)) return;

    this.noticeIfInvalidFormat(renamedFile);
  }

  private noticeIfInvalidFormat(file: TFile) {
    const { isValid, granularity, format } = isValidPeriodicNote(file.basename);
    if (isValid !== false) return;

    const fragment = document.createDocumentFragment();
    mount(InvalidFormat, {
      // @ts-ignore
      target: fragment,
      props: {
        granularity,
        filepath: file.path,
        formatValue: format.value,
        error: format.error
      }
    })
    new Notice(fragment, 10000)
  }
}
