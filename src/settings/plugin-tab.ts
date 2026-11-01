import { PluginService } from "@/app-service";
import { weekdayNames } from "@/calendar-locale";
import { DAILY_NOTES_PLUGIN_ID, DEFAULT_FORMATS_PER_GRANULARITY, granularities } from "@/constants";
import { formatTokenGuide, type TokenGuideItem } from "@/format-tokens";
import { getPeriodicityFromGranularity, IGranularity } from "@/io";
import type { DnPluginSettings } from "@/io/settings";
import { validateFolder, validateFormat, validateTemplate } from "@/io/validation";
import locales from "@/locales";
import { defaultWeekdays, sysLocaleKey } from "@/localization";
import { showsOn } from "@/navigation";
import { formatPeriod, periodRules, rangeOfPeriod, yearCycleOf, type PeriodName } from "@/periods";
import { switchLocale, updateWeekStartSetting } from "@/stores";
import { openNowIcon } from "@/ui/open-now";
import { STICKER_BUTTON_ICON } from "@/ui/sticker-actions";
import { genNoticeFragment } from "@/ui/utils";
import { isReservedStickerProperty, RESERVED_STICKER_PROPERTIES } from "@/ui/utils/emoji-picker";
import { capitalize } from "@/utils";
import { checkWeekFormat, weekSchemeFor } from "@/weeks";
import {
  App,
  type ButtonComponent,
  normalizePath,
  Notice,
  PluginSettingTab,
  type Setting,
  type SettingDefinitionItem,
  type SettingGroupItem,
  ToggleComponent,
} from "obsidian";
import { mount, unmount } from "svelte";
import { get, type Writable } from "svelte/store";
import writableDerived from "svelte-writable-derived";
import type { ISettings, PeriodSettings } from "./constants";
import { formatsToReset } from "./format-on-close";
import { openAtStartupOf, setOpenAtStartup, setPeriodEnabled } from "./period-switch";
import { settingsStore } from "./store";
import Format from "./ui/periods/Format.svelte";
import { headingExtras, mountBelow, nameWithIcon } from "./ui/rows";
import EmojiLanguages from "./ui/stickers/EmojiLanguages.svelte";
import { FileSuggest } from "./ui/suggest";
import MigrationNotice from "./ui/migrations/MigrationNotice.svelte";
import {
  forgetFinishedNotices,
  formatNoticeCount,
  formatRenamePlan,
  openFormatRename,
  openStickerMove,
  stickerMovePlan,
  stickerNoticeCount,
} from "./ui/migrations";

const settings = () => get(settingsStore);
const periodName = (g: IGranularity) => `${capitalize(getPeriodicityFromGranularity(g))} notes`;

/** Calendared: a period's settings as a store of their own, for the format field (Format.svelte) */
function periodStore(granularity: IGranularity): Writable<PeriodSettings> {
  return writableDerived(
    settingsStore,
    (s) => s.periods[granularity],
    (period, s) => ({ ...s, periods: { ...s.periods, [granularity]: period } }),
  );
}

/** Calendared: a copy of the settings with the value at a key such as `breadcrumbs.placement` replaced */
function withValueAt(value: unknown, path: string[], newValue: unknown): unknown {
  if (path.length === 0) return newValue;
  const [head, ...rest] = path;
  const object = (value ?? {}) as Record<string, unknown>;
  return { ...object, [head]: withValueAt(object[head], rest, newValue) };
}

/**
 * Calendared: the settings are written as definitions (Obsidian 1.13): one page divided by headings, with a page of its
 * own for each period and for migrations (docs/adr/0020, docs/spec/overview.md). Upstream drew two tabs with Svelte
 */
export class SettingsTab extends PluginSettingTab {
  private periodRowsQueued = false;
  private periodRowToggles = new WeakMap<HTMLElement, ToggleComponent>();

  constructor() {
    const plugin = PluginService.getPlugin();
    const app = plugin?.app as App;
    if (plugin && app) {
      super(app, plugin);
    }
    this.containerEl?.addClass("calendared-settings");
  }

  /** Only Obsidian before 1.13 calls this; the settings need the definitions */
  display() {
    this.containerEl.empty();
    this.containerEl.createEl("p", {
      text: "Calendared's settings need Obsidian 1.13.1 or later. Update Obsidian to change them.",
    });
  }

  getControlValue(key: string): unknown {
    const s = settings();
    switch (key) {
      case "weekStart":
        return defaultWeekdays[s.localeSettings.weekStartId];
      case "openAtStartup":
        return openAtStartupOf(s.periods);
      case "calendarLanguage":
        return s.localeSettings.localeOverride;
      // Calendared: a quarter's or year's cycle; missing is the calendar year (docs/adr/0039)
      case "periods.quarter.startMonth":
      case "periods.year.startMonth":
        return String(yearCycleOf(s.periods[key.split(".")[1] as "quarter" | "year"]).startMonth);
      case "periods.quarter.yearInName":
      case "periods.year.yearInName":
        return yearCycleOf(s.periods[key.split(".")[1] as "quarter" | "year"]).yearInName;
    }
    return key.split(".").reduce<unknown>((value, k) => (value as Record<string, unknown> | undefined)?.[k], s);
  }

  setControlValue(key: string, value: unknown) {
    const period = /^periods\.(\w+)\.enabled$/.exec(key)?.[1] as IGranularity | undefined;
    if (key === "weekStart") {
      updateWeekStartSetting(defaultWeekdays.indexOf(value as string));
    } else if (key === "calendarLanguage") {
      // also resets the week start to the language's, so its choices and value are read again
      switchLocale(value as string);
      this.update();
    } else if (key === "openAtStartup") {
      settingsStore.update((s) => ({ ...s, periods: setOpenAtStartup(s.periods, value as IGranularity | "none") }));
      this.update();
    } else if (period) {
      this.setPeriodEnabled(period, value as boolean);
    } else if (/^periods\.(quarter|year)\.(startMonth|yearInName)$/.test(key)) {
      const v = key.endsWith("startMonth") ? Number(value) : value;
      settingsStore.update((s) => withValueAt(s, key.split("."), v) as ISettings);
      // Year in names shows only for a cycle that doesn't start in January, and the examples change
      this.update();
    } else {
      settingsStore.update((s) => withValueAt(s, key.split("."), value) as ISettings);
    }
    this.refreshDomState();
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      ...this.generalSettings(),
      this.periodsGroup(),
      ...this.navigationGroups(),
      ...this.stickerGroups(),
      this.migrationPage(),
    ];
  }

  // Calendared: settings for everything, without a heading at the top (the plugin guidelines)
  private generalSettings(): SettingDefinitionItem[] {
    const s = settings();
    const locale = s.localeSettings.localeOverride;
    const names = weekdayNames(locale, 0).weekdays;
    const weekStartOptions: Record<string, string> = {};
    // Calendared: Saturday, Sunday or Monday only, like Google Calendar (docs/adr/0011), named in the calendar's language
    for (const i of [6, 0, 1]) weekStartOptions[defaultWeekdays[i]] = names[i];

    const languageOptions: Record<string, string> = {
      [sysLocaleKey]: `Same as system (${locales.get(sysLocaleKey) || sysLocaleKey})`,
    };
    for (const key of window.moment.locales()) {
      if (key !== sysLocaleKey) languageOptions[key] = locales.get(key) || key;
    }

    const startupOptions: Record<string, string> = { none: "Nothing" };
    const startupNames: Record<IGranularity, string> = {
      day: "Today's note",
      week: "This week's note",
      month: "This month's note",
      quarter: "This quarter's note",
      year: "This year's note",
    };
    for (const g of granularities) if (s.periods[g].enabled) startupOptions[g] = startupNames[g];

    return [
      {
        name: "Week starts on",
        // the week start also decides a weekly note's days (docs/adr/0011), which the name doesn't tell
        desc: "Also sets which 7 days a weekly note covers.",
        control: { type: "dropdown", key: "weekStart", options: weekStartOptions },
      },
      {
        name: "Open on startup",
        aliases: ["startup", "daily note"],
        control: { type: "dropdown", key: "openAtStartup", options: startupOptions },
      },
      {
        name: "Calendar language",
        desc: "Month and weekday names in the calendar, period breadcrumbs and mini calendar. File names use Obsidian's language.",
        control: { type: "dropdown", key: "calendarLanguage", options: languageOptions },
      },
      {
        name: "Confirm before creating notes",
        desc: "From the calendar, period breadcrumbs, mini calendar or Open now. Commands never ask.",
        control: { type: "toggle", key: "shouldConfirmBeforeCreate" },
      },
      {
        name: "Open now button",
        desc: "In the tab title bar of every note. Opens the current note of the shortest period you use (today's note if daily notes are on).",
        render: (setting) => {
          setting.setName(nameWithIcon(openNowIcon(), "Open now button"));
          setting.addToggle((toggle) =>
            toggle.setValue(settings().openNowHeaderButton).onChange((on) => this.setControlValue("openNowHeaderButton", on)),
          );
        },
      },
    ];
  }

  private periodsGroup(): SettingDefinitionItem {
    return {
      type: "group",
      heading: "Periodic notes",
      // ADR-0034: core Daily notes isn't read; when it is on too, say so faintly, without asking to turn it off
      extraButtons: coreDailyNotesOn()
        ? [
            headingExtras({
              description:
                "Core Daily notes is also on. Its \"Open today's daily note\" may create a second note for the same day.",
            }),
          ]
        : [],
      items: granularities.map((g) => this.periodPage(g)),
    };
  }

  private periodPage(granularity: IGranularity): SettingGroupItem {
    const periodicity = getPeriodicityFromGranularity(granularity);
    const isOn = () => settings().periods[granularity].enabled;
    return {
      type: "page",
      name: periodName(granularity),
      desc: periodSummary(granularity),
      status: () => (periodNeedsAttention(granularity) ? "warning" : null),
      // a page's row has no toggle, so one is added once the rows are drawn. This runs each time they are drawn
      visible: () => {
        this.queuePeriodRows();
        return true;
      },
      items: [
        {
          type: "group",
          items: [
            {
              name: `Use ${periodicity} notes`,
              desc: `Turning it off hides ${periodicity} notes from the calendar and the commands, and stops creating them. Notes you already have are kept.`,
              control: { type: "toggle", key: `periods.${granularity}.enabled` },
            },
          ],
        },
        {
          type: "group",
          visible: isOn,
          items: [
            {
              name: "Format",
              render: (setting) => {
                setting.setDesc(formatDescription(granularity));
                return mountBelow(setting, Format, { settings: periodStore(granularity), granularity });
              },
            },
            ...(granularity === "quarter" || granularity === "year" ? cycleSettings(granularity) : []),
            {
              name: "Folder",
              desc: `Where new ${periodicity} notes are created.`,
              control: {
                type: "folder",
                key: `periods.${granularity}.folder`,
                includeRoot: true,
                placeholder: "/",
                validate: (folder) => validateFolder(folder.trim()),
              },
            },
            {
              name: "Template",
              desc: `New ${periodicity} notes start with this file's contents.`,
              render: (setting) => this.renderTemplate(setting, granularity),
            },
          ],
        },
      ],
    };
  }

  private setPeriodEnabled(granularity: IGranularity, enabled: boolean) {
    settingsStore.update((s) => ({ ...s, periods: setPeriodEnabled(s.periods, granularity, enabled) }));
    // the last period on stays on: say why its toggle went back
    if (!enabled && settings().periods[granularity].enabled) new Notice("At least one period needs to stay on.");
    // the period rows say whether each is on
    this.update();
  }

  /**
   * The toggle at the right of each period's row, before the "›", and the row's summary under its name. A page's row
   * can't have a toggle of its own, so they are added to the drawn rows; if Obsidian draws them differently, the toggle
   * at the top of the period's page is still there
   */
  private queuePeriodRows() {
    if (this.periodRowsQueued) return;
    this.periodRowsQueued = true;
    queueMicrotask(() => {
      this.periodRowsQueued = false;
      const rows = Array.from(this.containerEl.querySelectorAll<HTMLElement>(".setting-item.mod-navigable"));
      for (const granularity of granularities) {
        const row = rows.find((el) => el.querySelector(".setting-item-name")?.textContent === periodName(granularity));
        const controlEl = row?.querySelector<HTMLElement>(".setting-item-control");
        if (!row || !controlEl) continue;

        // the summary is read when the row is drawn: going back from a period's page draws the rows again, but from
        // the definitions read before the page was opened
        row.querySelector(".setting-item-description")?.setText(periodSummary(granularity));
        let wrapper = controlEl.querySelector<HTMLElement>(".calendared-period-toggle");
        if (!wrapper) {
          wrapper = createDiv("calendared-period-toggle");
          controlEl.prepend(wrapper);
          // the row opens the page when clicked; a click on the toggle stops here. (Not preventDefault: the toggle is a
          // label, and that would keep its checkbox from changing)
          wrapper.addEventListener("click", (e) => e.stopPropagation());
          const toggle = new ToggleComponent(wrapper).onChange((on) => {
            if (on !== settings().periods[granularity].enabled) this.setPeriodEnabled(granularity, on);
          });
          toggle.toggleEl.setAttribute("aria-label", `Use ${getPeriodicityFromGranularity(granularity)} notes`);
          this.periodRowToggles.set(wrapper, toggle);
        }
        this.periodRowToggles.get(wrapper)?.setValue(settings().periods[granularity].enabled);
      }
    });
  }

  private renderTemplate(setting: Setting, granularity: IGranularity) {
    const templateFile = () => {
      const path = settings().periods[granularity].templatePath;
      return path ? this.app.vault.getFileByPath(path) : null;
    };
    let suggest: FileSuggest | undefined;
    setting.addText((text) => {
      text
        .setPlaceholder(`templates/${getPeriodicityFromGranularity(granularity)}`)
        .setValue(settings().periods[granularity].templatePath)
        .onChange((value) => {
          const path = value.trim() ? normalizePath(value.trim().endsWith(".md") ? value.trim() : `${value.trim()}.md`) : "";
          const error = path ? validateTemplate(path) : "";
          setting.setErrorMessage(error || null);
          if (error) return;
          settingsStore.update((s) => withValueAt(s, ["periods", granularity, "templatePath"], path) as ISettings);
          showOpenLink();
        });
      suggest = new FileSuggest(text.inputEl);
      const error = text.getValue() ? validateTemplate(text.getValue()) : "";
      if (error) setting.setErrorMessage(error);
    });
    // Calendared: the template can be opened from here to edit it, by a link in the description naming the file
    // (docs/spec/overview.md). Not a button beside the field: it shifted the field and looked like editing the path
    const description = (setting as unknown as { descEl: HTMLElement }).descEl;
    const openLine = description.createDiv();
    const showOpenLink = () => {
      openLine.empty();
      const file = templateFile();
      if (!file) return;
      openLine.createEl("a", { text: `Open ${file.name}`, href: "#" }).addEventListener("click", (event) => {
        event.preventDefault();
        this.app.setting?.close?.();
        void this.app.workspace.getLeaf("tab").openFile(file);
      });
    };
    showOpenLink();
    return () => suggest?.destroy();
  }

  // Calendared: the breadcrumbs and the mini calendar (docs/adr/0031, 0032), each turned on and off by its heading's
  // toggle (docs/adr/0033). "Period breadcrumbs" on screen, so it isn't taken for the community plugin "Breadcrumbs"
  private navigationGroups(): SettingDefinitionItem[] {
    const showOn = {
      options: { always: "All devices", phone: "Phones only" },
      desc: "Tablets don't count as phones.",
    };
    const featureToggle = (feature: "breadcrumbs" | "miniCalendar") => ({
      isOn: () => settings()[feature].enabled,
      onChange: (on: boolean) => this.setControlValue(`${feature}.enabled`, on),
    });
    return [
      {
        type: "group",
        heading: "Period breadcrumbs",
        cls: "calendared-heading-group",
        extraButtons: [
          headingExtras({
            description: "Shows where the note sits, such as 2026 › Q4 › Oct › W44 › 30, above the note. Click a period to open its note.",
            toggle: featureToggle("breadcrumbs"),
          }),
        ],
      },
      {
        type: "group",
        visible: () => settings().breadcrumbs.enabled,
        items: [
          { name: "Show on", desc: showOn.desc, control: { type: "dropdown", key: "breadcrumbs.placement", options: showOn.options } },
          { name: "Show on non-periodic notes", control: { type: "toggle", key: "breadcrumbs.onOtherNotes" } },
        ],
      },
      {
        type: "group",
        heading: "Mini calendar",
        cls: "calendared-heading-group",
        extraButtons: [
          headingExtras({
            description: "Shows the days (or weeks, months…) around the note, above it. Click one to open it.",
            toggle: featureToggle("miniCalendar"),
          }),
        ],
      },
      {
        type: "group",
        visible: () => settings().miniCalendar.enabled,
        items: [
          { name: "Show on", desc: showOn.desc, control: { type: "dropdown", key: "miniCalendar.placement", options: showOn.options } },
          { name: "Show on non-periodic notes", control: { type: "toggle", key: "miniCalendar.onOtherNotes" } },
          {
            name: "Days shown",
            desc: "For daily notes. Other notes show 2 on each side.",
            control: {
              type: "dropdown",
              key: "miniCalendar.dayLayout",
              options: { week: "Calendar week", centered: "3 days each side" },
            },
          },
          {
            name: "Show stickers",
            // has no effect while stickers are off
            visible: () => settings().stickersEnabled,
            control: { type: "toggle", key: "miniCalendar.displayStickers" },
          },
        ],
      },
      // applies to both, so it sits apart from both headings, and shows while either of them shows on desktop
      {
        type: "group",
        visible: () => showsOn(settings().breadcrumbs, false) || showsOn(settings().miniCalendar, false),
        items: [
          {
            name: "Compact on desktop",
            desc: "Show the period breadcrumbs and mini calendar in a small box at the top right of the note, instead of a bar under the tab title bar. Phones always use the bar.",
            control: { type: "toggle", key: "compactOnDesktop" },
          },
        ],
      },
    ];
  }

  // Calendared: turning stickers off hides everything about them (display, header button, menu item, commands).
  private stickerGroups(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        heading: "Stickers",
        cls: "calendared-heading-group",
        extraButtons: [
          headingExtras({
            description: "An emoji for each periodic note, shown in the calendar.",
            toggle: { isOn: () => settings().stickersEnabled, onChange: (on) => this.setControlValue("stickersEnabled", on) },
          }),
        ],
      },
      {
        type: "group",
        visible: () => settings().stickersEnabled,
        items: [
          {
            name: "Sticker button",
            desc: "In the tab title bar of periodic notes. Shows the note's sticker; click it to pick one.",
            render: (setting) => {
              setting.setName(nameWithIcon(STICKER_BUTTON_ICON, "Sticker button"));
              setting.addToggle((toggle) =>
                toggle.setValue(settings().stickerHeaderButton).onChange((on) => this.setControlValue("stickerHeaderButton", on)),
              );
            },
          },
          {
            name: "Sticker property",
            render: (setting) => {
              setting.setDesc(stickerPropertyDescription());
              setting.addText((text) => {
                // eslint-disable-next-line obsidianmd/ui/sentence-case -- the default property name, written as it is
                text.setPlaceholder("sticker").setValue(settings().stickerProperty);
                // saved when leaving the field, so the property doesn't change with each letter typed
                text.inputEl.addEventListener("blur", () => {
                  const property = text.getValue().trim();
                  const error =
                    property === ""
                      ? "Enter a property name for stickers."
                      : isReservedStickerProperty(property)
                        ? `'${property}' is one of Obsidian's built-in properties. Choose another name, such as 'sticker' or 'mood'.`
                        : "";
                  setting.setErrorMessage(error || null);
                  if (!error && property !== settings().stickerProperty) this.setControlValue("stickerProperty", property);
                });
              });
              // Calendared: under the field, while notes still use the property it had before (docs/adr/0035)
              const view = mount(MigrationNotice, { target: setting.infoEl.createDiv(), props: { which: "sticker" } });
              return () => void unmount(view);
            },
          },
          // the box of languages (EmojiLanguages.svelte) stays inside the Stickers group with its description; a
          // definitions list would be a group of its own, with a heading as large as "Stickers" and no description
          {
            name: "Emoji search languages",
            desc: "Search stickers in these languages too. Each one is downloaded once when added (from cdn.jsdelivr.net).",
            render: (setting) => mountBelow(setting, EmojiLanguages, {}),
          },
        ],
      },
    ];
  }

  // Calendared: the migrations live on a page of its own at the bottom (docs/adr/0023, 0024, docs/spec/migrations.md).
  // Each shows the list of notes it changes before it runs (review-modal.ts)
  private migrationPage(): SettingDefinitionItem {
    return {
      type: "page",
      name: "Migrate notes",
      desc: "Rename notes after changing a format, or move stickers after changing the sticker property.",
      status: () => (anyMigrationNotice() ? "warning" : null),
      items: [
        {
          type: "group",
          heading: "Rename notes to the current format",
          cls: "calendared-heading-group",
          extraButtons: [
            headingExtras({
              description: "Notes named in a previous format don't show in the calendar. Enter that format to rename them.",
            }),
          ],
          items: granularities.map((g) => ({
            name: periodName(g),
            visible: () => settings().periods[g].enabled,
            render: (setting: Setting) => this.renderFormatMigration(setting, g),
          })),
        },
        {
          type: "group",
          heading: "Move stickers to the current property",
          cls: "calendared-heading-group",
          extraButtons: [
            headingExtras({
              description: "Stickers in a previous property don't show in the calendar. Only periodic notes are changed.",
            }),
          ],
          items: [
            {
              name: "Previous property",
              visible: () => settings().stickersEnabled,
              render: (setting: Setting) => this.renderStickerMigration(setting),
            },
          ],
        },
      ],
    };
  }

  private renderFormatMigration(setting: Setting, granularity: IGranularity) {
    // the format before the last change, while its notice is up (docs/adr/0035)
    let previous = settings().migrationNotices.formats[granularity] ?? "";
    let button: ButtonComponent | undefined;
    const refresh = () => {
      const current = settings().periods[granularity].format;
      // a format that can't name this period's notes would read the wrong notes
      const error = previous.trim() ? validateFormat(previous.trim(), granularity) : "";
      setting.setErrorMessage(error || null);
      const plan = previous.trim() && !error ? formatRenamePlan(granularity, previous.trim()) : [];
      const renaming = plan.filter((row) => !row.conflict).length;
      const desc = createFragment();
      desc.createDiv({ text: `Current format: ${current}` });
      if (previous.trim() && !error) {
        desc.createDiv({
          text:
            plan.length === 0
              ? `No notes named in ${previous.trim()}.`
              : `${noteCount(plan.length)} named in ${previous.trim()}` + (plan.length > renaming ? ` (${plan.length - renaming} will be skipped).` : "."),
        });
      }
      setting.setDesc(desc);
      button?.setButtonText(plan.length === 0 || renaming === 0 ? "Review…" : `Rename ${noteCount(renaming)}…`).setDisabled(plan.length === 0);
    };
    setting.addText((text) =>
      text
        .setPlaceholder("Previous format")
        .setValue(previous)
        .onChange((value) => {
          previous = value;
          refresh();
        }),
    );
    setting.addButton((b) => {
      button = b;
      b.onClick(() => openFormatRename(granularity, previous.trim(), refresh));
    });
    refresh();
  }

  private renderStickerMigration(setting: Setting) {
    let previous = settings().migrationNotices.stickerProperty ?? "";
    let button: ButtonComponent | undefined;
    const refresh = () => {
      const plan = previous.trim() ? stickerMovePlan(previous.trim()) : [];
      const moving = plan.filter((row) => !row.conflict).length;
      const desc = createFragment();
      desc.createDiv({ text: `Current property: ${settings().stickerProperty}` });
      if (previous.trim()) {
        desc.createDiv({
          text:
            plan.length === 0
              ? `No periodic notes have "${previous.trim()}".`
              : `${noteCount(plan.length)} have "${previous.trim()}"` + (plan.length > moving ? ` (${plan.length - moving} will be skipped).` : "."),
        });
      }
      setting.setDesc(desc);
      button?.setButtonText(plan.length === 0 || moving === 0 ? "Review…" : `Move ${moving === 1 ? "1 sticker" : `${moving} stickers`}…`).setDisabled(plan.length === 0);
    };
    setting.addText((text) =>
      text
        // eslint-disable-next-line obsidianmd/ui/sentence-case -- a property name, written as it is
        .setPlaceholder("mood")
        .setValue(previous)
        .onChange((value) => {
          previous = value;
          refresh();
        }),
    );
    setting.addButton((b) => {
      button = b;
      b.onClick(() => openStickerMove(previous.trim(), refresh));
    });
    refresh();
  }

  hide() {
    super.hide();
    // Calendared: a notice whose notes were all renamed or moved elsewhere is done (docs/adr/0035)
    forgetFinishedNotices();

    // Calendared: a period has one format (docs/adr/0019). An empty or invalid one is replaced with the default, so
    // creating a note always has a valid format. Turned-off periods keep theirs, which finds the notes you already have
    for (const g of formatsToReset(settings().periods)) this.resetFormat(g);
    const errors = formatsToReset(settings().periods).map((g) => capitalize(getPeriodicityFromGranularity(g)));

    if (errors.length > 0) {
      new Notice(genNoticeFragment([
        ['Warning: Invalid settings for these periods: '],
        [errors.join(', '), 'u-pop'],
        ['. Calendar functionality may be affected.']
      ]), 8000);
    }
  }

  private resetFormat(granularity: IGranularity) {
    const invalidValue = settings().periods[granularity].format;
    const correctedValue = DEFAULT_FORMATS_PER_GRANULARITY[granularity];
    settingsStore.update((s) => {
      s.periods[granularity].format = correctedValue;
      return s;
    });
    if (!invalidValue.trim()) return;

    const periodicity = capitalize(getPeriodicityFromGranularity(granularity));
    new Notice(genNoticeFragment([
      [periodicity, 'u-pop'],
      [' format '],
      [invalidValue, 'u-pop'],
      [' is invalid. '],
      ['Using '],
      [correctedValue, 'u-pop'],
      [' to prevent errors.'],
    ]), 8000);
  }
}

const noteCount = (n: number) => `${n} ${n === 1 ? "note" : "notes"}`;

/** Calendared: notes still use a format or sticker property from before a change (docs/adr/0035) */
function anyMigrationNotice(): boolean {
  const s = settings();
  return granularities.some((g) => formatNoticeCount(g, s) > 0) || stickerNoticeCount(s) > 0;
}

function coreDailyNotesOn(): boolean {
  const app = PluginService.getPlugin()?.app;
  return !!app?.internalPlugins?.getPluginById<DnPluginSettings>(DAILY_NOTES_PLUGIN_ID)?.enabled;
}

const monthName = (month: number) => new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2000, month - 1, 1));

/**
 * Calendared: the month a quarter's or year's 12-month cycle starts in, and which of its years names the notes
 * (docs/adr/0039). The second one shows only when the cycle doesn't start in January, with an example from this year
 */
function cycleSettings(granularity: "quarter" | "year"): SettingGroupItem[] {
  const noun = granularity === "quarter" ? "quarters' year" : "year";
  const example = (yearInName: "start" | "end") => {
    const s = settings();
    const rules = periodRules(weekSchemeFor(s.localeSettings), {
      [granularity]: { ...yearCycleOf(s.periods[granularity]), yearInName },
    });
    const thisYear = window.moment().year() + (yearInName === "end" ? 1 : 0);
    const period: PeriodName = granularity === "quarter"
      ? { granularity, year: thisYear, quarter: 4 }
      : { granularity, year: thisYear };
    const range = rangeOfPeriod(period, rules)!;
    const format = s.periods[granularity].format.trim() || DEFAULT_FORMATS_PER_GRANULARITY[granularity];
    return `${range.start.format("MMM YYYY")} – ${range.end.format("MMM YYYY")} is ${formatPeriod(period, format, rules)}`;
  };
  return [
    {
      name: "Starts in",
      desc: `The month the ${noun} starts in. Changing it doesn't rename notes you already have: each keeps its name, which then stands for the new period.`,
      control: {
        type: "dropdown",
        key: `periods.${granularity}.startMonth`,
        options: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), monthName(i + 1)])),
      },
    },
    {
      name: "Year in names",
      desc: `The year the notes are named after. Year it starts: ${example("start")}. Year it ends: ${example("end")}.`,
      visible: () => yearCycleOf(settings().periods[granularity]).startMonth !== 1,
      control: {
        type: "dropdown",
        key: `periods.${granularity}.yearInName`,
        options: { start: "Year it starts", end: "Year it ends" },
      },
    },
  ];
}

/** The second line of a period's row: its format and folder, or that it is off */
function periodSummary(granularity: IGranularity): string {
  const period = settings().periods[granularity];
  if (!period.enabled) return "Off";
  const parts = [period.format, period.folder.trim() || "/"];
  // Calendared: a quarter's or year's start month, if it isn't January (docs/adr/0039)
  if (granularity === "quarter" || granularity === "year") {
    const { startMonth } = yearCycleOf(period);
    if (startMonth !== 1) parts.push(`from ${monthName(startMonth)}`);
  }
  if (period.openAtStartup) parts.push("Opens at startup");
  return parts.join(" · ");
}

/** An invalid format, or a weekly format that breaks around New Year or differs from the calendar's week numbers */
function periodNeedsAttention(granularity: IGranularity): boolean {
  const period = settings().periods[granularity];
  if (!period.enabled) return false;
  if (validateFormat(period.format, granularity)) return true;
  if (formatNoticeCount(granularity, settings()) > 0) return true;
  if (granularity !== "week") return false;
  const check = checkWeekFormat(period.format.trim(), weekSchemeFor(settings().localeSettings));
  return !!(check.unreadable || check.mismatched);
}

// Calendared: list the period's tokens instead of linking to Moment.js's documentation, whose tokens mean calendar
// years and quarters and include ones a period's name can't use (docs/adr/0042)
function formatDescription(granularity: IGranularity): DocumentFragment {
  const { required, optional } = formatTokenGuide(granularity);
  const fragment = createFragment();
  const tokenLine = (label: string, items: TokenGuideItem[]) => {
    const line = fragment.createDiv();
    line.appendText(label);
    items.forEach(({ token, meaning }, i) => {
      line.createEl("code", { text: token });
      line.appendText(` ${meaning}${i < items.length - 1 ? ", " : ""}`);
    });
  };
  tokenLine("Needs: ", required);
  tokenLine("Also: ", optional);
  const text = fragment.createDiv();
  text.appendText("Text in brackets is kept as is: ");
  text.createEl("code", { text: granularity === "week" ? "[W]" : "[Notes]" });
  if (granularity === "quarter" || granularity === "year") {
    text.appendText(granularity === "quarter" ? ". YYYY and Q count from Starts in." : ". YYYY counts from Starts in.");
  }
  return fragment;
}

function stickerPropertyDescription(): DocumentFragment {
  const fragment = createFragment();
  fragment.createDiv({ text: "Property that holds the sticker. Adding a sticker replaces its value." });
  // always show which names are refused, from the same list the check uses
  const reserved = fragment.createDiv();
  reserved.appendText("Can't be one of Obsidian's built-in properties: ");
  RESERVED_STICKER_PROPERTIES.forEach((name, i) => {
    reserved.createEl("code", { text: name });
    if (i < RESERVED_STICKER_PROPERTIES.length - 1) reserved.appendText(", ");
  });
  return fragment;
}
