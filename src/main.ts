import { DEFAULT_SETTINGS, settingsStore, SettingsTab, type ISettings } from '@/settings';
import { InvalidFormat, View, ViewManager } from '@/ui';
import { MarkdownView, Menu, Notice, Plugin, TAbstractFile, TFile, WorkspaceLeaf, WorkspaceRoot, Platform } from 'obsidian';
import { mount, type SvelteComponent } from 'svelte';
import { get } from 'svelte/store';
import { PluginService } from './app-service';
import { CALENDAR_LUCIDE_ICON, CALENDAR_POPOVER_ID, CALENDAR_RIBBON_ID, granularities, LEAF_TYPE } from './constants';
import { basename, createOrOpenNote, extractAndReplaceTODOItems, getStartupNoteGranularity, isBackupPath, storeAllVaultPeriodicFilepaths } from './io';
import { getPeriodicityFromGranularity } from './io/parse';
import type { IGranularity } from './io/types';
import { isValidPeriodicNote } from './io/validation';
import {
  activeFileStore,
  displayedDateStore,
  internalFileModStore,
  mainLeafStore,
  pluginClassStore,
  previewLeafStore,
  processingPreviewChangeStore,
  setupLocale,
  themeStore,
  timelineParentFileStore
} from './stores';
import TimelineManager from './ui/components/timeline/manager';
import { createNldatePickerDialog } from './ui/modals/nldate-picker';
import { Popover } from './ui/popovers';
import { getDailyNotesPlugin } from './utils';
import { CalendarView } from './view';
import { createCalendarPopover } from './ui/popovers/base';
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
    Popover.calendarSingleton?.cleanup();
    Popover.stickerSingleton?.cleanup();
    Popover.fileMenuSingleton?.cleanup();
    Popover.baseSingleton?.cleanup();
    Popover.cleanup();
    TimelineManager.destroy();
    this.stickerActions.removeAll();
  }

  async onload() {
    PluginService.init(this);

    await this.loadSettings();
    this.registerEvents()

    pluginClassStore.set(this);

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
    this.handleRibbon();

    // register view and preview
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

    granularities.forEach((granularity) => {
      (['previous', 'current', 'next'] as const).forEach((pos) => {
        const periodicity = getPeriodicityFromGranularity(granularity)

        let posText:
          | `${typeof pos}-${typeof periodicity}` = `${pos}-${periodicity}`

        this.addCommand({
          id: `create-${posText}-note`,
          name: `Open${pos === 'current' ? '' : ` ${pos}`} ${periodicity} note`,
          // Calendared: upstream used `callback`. With `checkCallback`, Obsidian asks first (checking = true)
          // and hides the command while its period is disabled in settings
          checkCallback: (checking) => {
            if (!get(settingsStore).periods[granularity].enabled) return false;
            if (checking) return true;

            const leaf = this.app.workspace.getLeaf(false);
            let newDate = window
              .moment()
              .clone()
              .startOf(granularity);
            if (pos !== 'current') {
              newDate = newDate.clone()[pos === 'next' ? 'add' : 'subtract'](1, granularity)
            }

            createOrOpenNote({ leaf, date: newDate, granularity, confirmBeforeCreateOverride: false }).catch(console.error);
            return true;
          }
        });
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

    this.addCommand({
      id: 'open-nldate-note',
      name: 'Open periodic note from natural language date',
      callback: createNldatePickerDialog,
    });

    this.app.workspace.onLayoutReady(async () => {
      ViewManager.initView({ active: false });
      ViewManager.handleLayoutChange().catch(console.error);
      TimelineManager.create()?.mountAll();

      // Calendared: when the plugin is enabled while a note is already open, no `file-open` fires,
      // so pick up the current note once here (on app startup this just repeats what `file-open` does)
      this.onFileOpen(this.app.workspace.getActiveFile());
      this.stickerActions.refresh();

      if (get(settingsStore).openPopoverOnRibbonHover) {
        createCalendarPopover({
          view: {
            Component: View,
            props: {
              popover: true
            }
          }
        })
      }

      // open note at startup
      const startupNoteGranularity = getStartupNoteGranularity();
      if (startupNoteGranularity) {
        await createOrOpenNote({
          leaf: this.app.workspace.getLeaf(),
          date: window.moment(),
          granularity: startupNoteGranularity,
          confirmBeforeCreateOverride: false,
          openInPreview: get(settingsStore).preview.enabled && get(settingsStore).preview.openNotesInPreview
        });
      }

      // index existing notes
      storeAllVaultPeriodicFilepaths(true)
    });
  }

  async loadSettings() {
    const loadedSettings = (await this.loadData()) as ISettings;
    if (!loadedSettings) {
      await this.saveData(DEFAULT_SETTINGS)
    }

    settingsStore.update((old) => {
      const newSettings = { ...old, ...(loadedSettings || {}) };
      const periods = newSettings.periods
      Object.entries(periods).forEach(([granularity, periodSettings]) => {
        Object.values(periodSettings.formats).forEach((format) => {
          periods[granularity as IGranularity].formats[format.id].loading = false
        })
      })
      return {
        ...newSettings,
        preview: {
          ...newSettings.preview,
          splitMode: Platform.isPhone ? false : newSettings.preview.splitMode
        },
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
    const ribbonEl = this.addRibbonIcon(CALENDAR_LUCIDE_ICON, 'Open calendar', (ev) => {
      const calendarPopover = Popover.calendarSingleton;

      if (!get(settingsStore).floatingMode) {
        this.toggleView().catch(console.error);

        if (get(settingsStore).openPopoverOnRibbonHover && calendarPopover?.behaviors?.opened) {
          calendarPopover.behaviors.close();
        }

        return;
      } else {
        const calendarEl = document.querySelector(`#${CALENDAR_POPOVER_ID}[data-popover="true"]`) as HTMLElement | undefined;
        const target = ev.target as Element

        if (
          !calendarEl &&
          !calendarPopover &&
          target
        ) {
          createCalendarPopover({
            view: {
              Component: View,
              props: {
                popover: true,
              }
            }
          }).open(target)
        } else {
          calendarPopover?.toggle(target)
        }
      }
    });

    ribbonEl.id = CALENDAR_RIBBON_ID
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
      this.app.vault.on('delete', (file) => this.onFileDeleted(file))
    );
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) =>
        this.onFileRenamed(file, oldPath)
      )
    );
    this.registerEvent(
      this.app.metadataCache.on('changed', () => this.onMetadataChanged())
    )
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => this.onFileOpen(file))
    )
    // Calendared: keep the header sticker buttons in step with the notes shown and their stickers
    this.registerEvent(this.app.workspace.on('file-open', () => this.stickerActions.refresh()))
    this.registerEvent(this.app.workspace.on('layout-change', () => this.stickerActions.refresh()))
    this.registerEvent(this.app.metadataCache.on('changed', () => this.stickerActions.refresh()))
  }

  /**
   * Calendared: keep the calendar in step with whichever note is open, however it was opened
   * (file explorer, a hotkey, links, switching tabs...). Upstream only updated the selection when a note was
   * opened from the calendar, and followed other opens (`syncCalendar`) inside TimelineManager, so nothing
   * happened while the timeline was disabled.
   */
  private onFileOpen(file: TFile | null) {
    // nothing open (e.g. the last tab was closed) or a non-periodic note: nothing on the calendar is "open" anymore
    if (!file) {
      activeFileStore.set({ file: null, date: null, granularity: null });
      return;
    }
    const { isValid, granularity, date } = isValidPeriodicNote(file.basename);
    if (typeof isValid !== "boolean" || !date || !granularity) {
      activeFileStore.set({ file: null, date: null, granularity: null });
      return;
    }

    activeFileStore.set({ file, date, granularity });

    // move the calendar to the note's month, except for notes shown in the calendar's own preview panel
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (get(settingsStore).syncCalendar && !ViewManager.isPreviewLeaf(leaf)?.leaf) {
      displayedDateStore.set(date);
    }
  }

  private async onFileMenu(_menu: Menu, file: TAbstractFile, source?: string) {
    if (!(file instanceof TFile)) return;

    const menu = _menu as Menu & { dom: Element; bgEl: Element }

    const { isValid, granularity, date } = isValidPeriodicNote(file.basename);
    const activeCalendarView = PluginService.getPlugin()?.app.workspace.getActiveViewOfType(CalendarView)
    if (typeof isValid === 'boolean' && date && granularity) {
      // Reveal on calendar
      if (!activeCalendarView) {
        menu.addItem((item) =>
          item.setSection("open")
            .setTitle("Reveal on calendar")
            .setIcon("lucide-calendar")
            .onClick(() => {
              ViewManager.revealView().catch(console.error);
              activeFileStore.update((d) => {
                if (d) {
                  d.file = file;
                }
                return d
              })
              displayedDateStore.set(window.moment())
            })
        )
      }
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

    // preview

    // Open on preview
    const crrActiveLeaf = PluginService.getPlugin()?.app.workspace.getActiveViewOfType(MarkdownView)?.leaf;
    const crrActiveLeafId = crrActiveLeaf?.id;
    const previewLeafId = get(previewLeafStore)?.leaf?.id;
    const crrActiveLeafIsPreview = crrActiveLeafId && previewLeafId && (crrActiveLeafId === previewLeafId)
    if (get(settingsStore).preview.enabled && !crrActiveLeafIsPreview) {
      menu.addItem((item) =>
        item.setSection("open")
          .setTitle("Open in preview panel")
          .setIcon("lucide-eye")
          .onClick(async () => {
            if (!get(mainLeafStore)?.visible) {
              await ViewManager.revealView();
            }
            ViewManager.restartPreview(file, true)
          })
      );
      menu.addItem((item) =>
        item.setSection("open")
          .setTitle("Open in preview panel (right)")
          .setIcon("lucide-eye")
          .onClick(async () => {
            if (!get(mainLeafStore)?.visible) {
              await ViewManager.revealView();
            }
            // TODO: avoid rebuilding the preview leaf, try to `reveal` an exisitng one when possible
            ViewManager.restartPreview(file, true, 'vertical')
          })
      );
      menu.addItem((item) =>
        item.setSection("open")
          .setTitle("Open in preview panel (down)")
          .setIcon("lucide-eye")
          .onClick(async () => {
            if (!get(mainLeafStore)?.visible) {
              await ViewManager.revealView();
            }
            // TODO: avoid rebuilding the preview leaf, try to `reveal` an exisitng one when possible
            ViewManager.restartPreview(file, true, 'horizontal')
          })
      );
    }
  }

  private onFileCreated(file: TAbstractFile) {
    if (!(file instanceof TFile)) return;

    if (get(internalFileModStore) === 'created') return;


    if (this.app.workspace.layoutReady) {
      if (file.extension !== 'md') return;
      if (isBackupPath(file.path)) return;

      const { isValid, date, granularity, format } = isValidPeriodicNote(file.basename);

      if (isValid === false) {
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
      if (typeof isValid === "boolean") {
        settingsStore.addFilepath(file.path, format.value)
        extractAndReplaceTODOItems(date, granularity, file).catch(console.error)
      }
    }
  }

  private async onFileDeleted(file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile)) return;

    if (get(internalFileModStore) === 'deleted') return;

    if (this.app.workspace.layoutReady) {
      if (file.extension !== 'md') return;

      const { granularity, format } = isValidPeriodicNote(file.basename);

      if (granularity && format) {
        settingsStore.deleteFilepath(file.path, format.value)
      }
      this.closePreviewOnFileDeleted(file)

      // reset file state
      // this will add some cognitive load for sure
      activeFileStore.set({ file: null, date: null, granularity: null })
      timelineParentFileStore.set(null)
    }
  }

  private async onFileRenamed(renamedFile: TAbstractFile, oldPath: string): Promise<void> {
    if (!(renamedFile instanceof TFile)) return;

    if (get(internalFileModStore) === 'renamed') return;

    const _oldData = isValidPeriodicNote(basename(oldPath));
    const _newData = isValidPeriodicNote(renamedFile.basename);

    if (_newData.isValid === false) {
      const fragment = document.createDocumentFragment();
      mount(InvalidFormat, {
        // @ts-ignore
        target: fragment,
        props: {
          granularity: _newData.granularity,
          filepath: renamedFile.path,
          formatValue: _newData.format.value,
          error: _newData.format.error
        }
      })
      new Notice(fragment, 10000)
    }
    settingsStore.renameFilepath({
      oldData: {
        path: oldPath,
        formatValue: _oldData.format?.value,
        toBeDeleted: typeof _oldData.isValid === "boolean"
      },
      newData: {
        path: renamedFile.path,
        formatValue: _newData.format?.value,
        toBeAdded: typeof _newData.isValid === 'boolean' && renamedFile.extension === 'md'
      }
    })
  }

  private onMetadataChanged() {
    internalFileModStore.set({ modified: Math.random() })
  }

  private closePreviewOnFileDeleted(file: TFile) {
    const previewLeaf = ViewManager.searchPreviewLeaf(file)

    if (previewLeaf) {
      ViewManager.cleanupPreview({ leaf: previewLeaf });
    }
    processingPreviewChangeStore.set(true)
    settingsStore.update((s) => {
      s.preview.open = false;
      return s;
    });
  }
}
