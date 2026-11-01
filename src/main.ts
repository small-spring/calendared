import { DEFAULT_SETTINGS, settingsFromSaved, settingsStore, SettingsTab, type ISettings } from '@/settings';
import { invalidFormatNotice, ViewManager } from '@/ui';
import { MarkdownView, Notice, Plugin, TAbstractFile, TFile, WorkspaceLeaf, WorkspaceRoot } from 'obsidian';
import { get } from 'svelte/store';
import { PluginService } from './app-service';
import { CALENDAR_LUCIDE_ICON, granularities, LEAF_TYPE } from './constants';
import { getFileData, initVaultSource, openCurrentNote } from './io';
import { getPeriodicityFromGranularity } from './io/parse';
import type { IGranularity } from './io/types';
import { isValidPeriodicNote, periodicNoteOf, validateFormat } from './io/validation';
import { overlapsMonth, periodRulesFor, rangeOfPeriod, shiftPeriod } from './periods';
import {
  displayedDateStore,
  refreshToday,
  themeStore,
  todayStore,
} from './stores';
import NavigationManager from './ui/components/navigation/manager';
import { closeNoteMenu } from './ui/note-menu';
import { OpenNowActions } from './ui/open-now';
import { destroyStickerPicker } from './ui/sticker-picker';
import { CalendarView } from './view';
import { initEmojiSearch } from './ui/utils/emoji-locale';
import { HOVER_LINK_SOURCE } from './ui/utils/event-handlers';
import { trackSettingChanges } from './settings/migration-notice';
import { openAtStartupOf } from './settings/period-switch';
import { followTemplateRename } from './settings/template-rename';
import { currentNoteName } from './period-words';
import { getNoteSticker, isPeriodicNote, MANAGE_STICKER, openStickerPicker, removeSticker, StickerActions } from './ui/sticker-actions';

export default class PeriodicNotesCalendarPlugin extends Plugin {
  /** Calendared: sticker button in the header of periodic notes */
  stickerActions = new StickerActions();
  /** Calendared: Open now button in the header of every note (docs/adr/0030) */
  openNowActions = new OpenNowActions();

  /**
   * Calendared: upstream left this empty, so popovers mounted on document.body (calendar, sticker picker, ...)
   * and timelines stayed in the page after the plugin was turned off. On the next load the new picker looked
   * itself up by id and got the stale one from the previous load instead.
   */
  onunload() {
    destroyStickerPicker();
    closeNoteMenu();
    NavigationManager.destroy();
    this.stickerActions.removeAll();
    this.openNowActions.removeAll();
  }

  async onload() {
    PluginService.init(this);
    // Calendared: the UI reads notes and stickers through the vault source (docs/adr/0016)
    initVaultSource(this.app);

    await this.loadSettings();
    this.registerEvents()

    // theme
    themeStore.set(this.getTheme());

    // Calendared: remember the format or sticker property a change leaves behind, for the settings' notice (docs/adr/0035)
    this.register(trackMigrationNotices());

    // sub settings
    const unsubSettingsStore = settingsStore.subscribe(this.saveSettings.bind(this))
    this.register(unsubSettingsStore);
    // Calendared: show/hide the header sticker buttons when the sticker settings change
    this.register(settingsStore.subscribe(() => this.stickerActions.refresh()));
    this.register(settingsStore.subscribe(() => this.openNowActions.refresh()));
    // Calendared: upstream's calendar view kept today current with its own timer, so with the pane closed
    // the date went stale. The plugin does it now; the header's Open now button is re-dimmed on a new day
    this.registerInterval(window.setInterval(refreshToday, 1000 * 60));
    this.register(todayStore.subscribe(() => this.openNowActions.refresh()));
    // Calendared: add or remove the breadcrumbs and mini calendar when the settings change which notes show them
    this.register(settingsStore.subscribe(() => NavigationManager.instance?.syncAll()));

    this.addSettingTab(new SettingsTab());
    // Calendared: a row in the Page preview settings, where Ctrl/Cmd on hover is switched (docs/adr/0026)
    this.registerHoverLinkSource(HOVER_LINK_SOURCE, { display: "Calendared", defaultMod: true });

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
    granularities.forEach((granularity) => {
      this.addCommand({
        id: `create-current-${getPeriodicityFromGranularity(granularity)}-note`,
        name: currentNoteName(granularity, "open"),
        // Calendared: upstream used `callback`. With `checkCallback`, Obsidian asks first (checking = true)
        // and hides the command while its period is disabled in settings
        checkCallback: (checking) => {
          if (!get(settingsStore).periods[granularity].enabled) return false;
          if (checking) return true;

          openCurrentNote(granularity, { leaf: this.app.workspace.getLeaf(false), confirmBeforeCreateOverride: false })
            .catch(console.error);
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
          const note = periodicNoteOf(file);
          if (!note) return false;
          const { granularity, period } = note;
          if (checking) return true;

          const rules = periodRulesFor(get(settingsStore));
          const targetPeriod = shiftPeriod(period, pos === 'next' ? 1 : -1, rules);
          const { file: target } = getFileData(granularity, rangeOfPeriod(targetPeriod, rules)!.start);
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
      name: MANAGE_STICKER,
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
      NavigationManager.create().syncAll();

      // Calendared: when the plugin is enabled while a note is already open, no `file-open` fires,
      // so pick up the current note once here (on app startup this just repeats what `file-open` does)
      this.onFileOpen(this.app.workspace.getActiveFile());
      this.stickerActions.refresh();
      this.openNowActions.refresh();

      // open note at startup
      const startupNoteGranularity = openAtStartupOf(get(settingsStore).periods);
      if (startupNoteGranularity !== "none") {
        // Calendared: the period's first day, as the commands and Open now pass. Upstream passed now, so a template's
        // {{date}} differed from a note made by a command (docs/adr/0039)
        await openCurrentNote(startupNoteGranularity, {
          leaf: this.app.workspace.getLeaf(),
          confirmBeforeCreateOverride: false,
        });
      }
    });
  }

  async loadSettings() {
    // Calendared: nothing is saved here on the first start; the settings store's subscription saves the defaults.
    // Upstream merged the saved settings over the defaults at the top level only; see settingsFromSaved
    const saved: unknown = await this.loadData();
    settingsStore.set(settingsFromSaved(saved, DEFAULT_SETTINGS));
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
      // Calendared: no leaf could be made (no right sidebar); upstream read `tabHeaderEl` of null
      if (!leaf) return;
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
        // Calendared: close the tab and put the calendar back in the right sidebar. Upstream unloaded the view only,
        // which left the tab open with nothing in it (initView found the same leaf and kept it)
        leaf.detach();
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
    // Calendared: a template setting follows its file when it is renamed or moved (docs/adr/0049)
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        const periods = followTemplateRename(get(settingsStore).periods, oldPath, file.path);
        if (periods) settingsStore.update((s) => ({ ...s, periods }));
      })
    );
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => this.onFileOpen(file))
    )
    // Calendared: keep the header sticker buttons in step with the notes shown and their stickers
    this.registerEvent(this.app.workspace.on('file-open', () => this.stickerActions.refresh()))
    this.registerEvent(this.app.workspace.on('layout-change', () => this.stickerActions.refresh()))
    this.registerEvent(this.app.workspace.on('file-open', () => this.openNowActions.refresh()))
    this.registerEvent(this.app.workspace.on('layout-change', () => this.openNowActions.refresh()))
    this.registerEvent(this.app.vault.on('rename', () => this.openNowActions.refresh()))
    this.registerEvent(this.app.metadataCache.on('changed', () => this.stickerActions.refresh()))
    // Calendared: upstream re-mounted the timeline only on workspace `resize`, so opening another note in the same tab
    // kept the previous note's timeline (e.g. a monthly note's Q1 view on a daily note).
    // Each tab keeps its breadcrumbs and mini calendar while it shows the same note (docs/adr/0017); tabs opened,
    // closed or moved and renamed notes are picked up too
    this.registerEvent(this.app.workspace.on('file-open', () => NavigationManager.instance?.syncAll()))
    this.registerEvent(this.app.workspace.on('layout-change', () => NavigationManager.instance?.syncAll()))
    this.registerEvent(this.app.vault.on('rename', () => NavigationManager.instance?.syncAll()))
  }

  /**
   * Calendared: keep the displayed month in step with whichever note is open, however it was opened
   * (file explorer, a hotkey, links, switching tabs...). Upstream followed other opens (`syncCalendar`) inside
   * TimelineManager, so nothing happened while the timeline was disabled. The selection needs nothing here: the
   * calendar reads the open note itself (docs/adr/0015)
   */
  private onFileOpen(file: TFile | null) {
    if (!file) return;
    const note = periodicNoteOf(file);
    if (!note) return;
    const { date, period } = note;

    // Calendared: always follow the open note, but only when no day of it is on the displayed month already.
    // Otherwise clicking a year title would jump to January, or a week number to the month the week starts in.
    // `date` is the period's first day (docs/spec/periods.md)
    if (!overlapsMonth(period, get(displayedDateStore), periodRulesFor(get(settingsStore)))) {
      displayedDateStore.set(date);
    }
  }

  /**
   * Calendared: tell when a note is named like a periodic note but with a format that has an error. Upstream also kept
   * a list of the vault's periodic notes in the settings (data.json) up to date here; the views and the settings now
   * read the vault itself (docs/adr/0016)
   */
  private onFileCreated(file: TAbstractFile) {
    if (!(file instanceof TFile)) return;
    if (!this.app.workspace.layoutReady) return;
    if (file.extension !== 'md') return;

    this.noticeIfInvalidFormat(file);
  }

  private onFileRenamed(renamedFile: TAbstractFile) {
    if (!(renamedFile instanceof TFile)) return;
    // Calendared: like a created file, only notes, and not while the vault is still loading
    if (!this.app.workspace.layoutReady) return;
    if (renamedFile.extension !== 'md') return;

    this.noticeIfInvalidFormat(renamedFile);
  }

  private noticeIfInvalidFormat(file: TFile) {
    const { isValid, granularity, format } = isValidPeriodicNote(file);
    if (isValid !== false) return;

    new Notice(invalidFormatNotice({
      granularity,
      filepath: file.path,
      formatValue: format,
      error: validateFormat(format, granularity),
    }), 10000)
  }
}

/**
 * Calendared: keeps `migrationNotices` up to date as the format or sticker property changes. Compares copies of the
 * values: some settings are changed in place (e.g. a period's format), so the previous settings object has the new value
 */
function trackMigrationNotices(): () => void {
  const tracked = (s: ISettings) => ({
    periods: Object.fromEntries(granularities.map((g) => [g, { format: s.periods[g].format }])) as Record<IGranularity, { format: string }>,
    stickerProperty: s.stickerProperty,
  });
  let before = tracked(get(settingsStore));
  return settingsStore.subscribe((s) => {
    const after = tracked(s);
    const notices = trackSettingChanges(s.migrationNotices, before, after);
    before = after;
    if (notices !== s.migrationNotices) settingsStore.update((current) => ({ ...current, migrationNotices: notices }));
  });
}
