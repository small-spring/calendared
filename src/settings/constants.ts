import { DEFAULT_FORMATS_PER_GRANULARITY, granularities } from "@/constants";
import { type IGranularity } from "@/io";
import { sysLocaleKey, sysWeekStartId } from "../localization";
import { toSupportedWeekStart } from "../weeks";
import { NO_MIGRATION_NOTICES, type MigrationNotices } from "./migration-notice";
import {
  DEFAULT_BREADCRUMBS,
  DEFAULT_MINI_CALENDAR,
  type BreadcrumbsSettings,
  type MiniCalendarSettings,
} from "../navigation";

export interface PeriodSettings {
  enabled: boolean;
  openAtStartup: boolean;

  /** Calendared: the one format of the period's notes, used to name new notes and to read existing ones (docs/adr/0019) */
  format: string;
  folder: string;
  templatePath: string;
}

export interface ISettings {
  periods: Record<IGranularity, PeriodSettings>;
  /** Calendared: the breadcrumbs above a note (docs/adr/0031). With the mini calendar, replaces upstream's timeline */
  breadcrumbs: BreadcrumbsSettings;
  /** Calendared: the mini calendar above a note (docs/adr/0031) */
  miniCalendar: MiniCalendarSettings;
  /** Calendared: on desktop, show both in a small box at the top right of the note instead of a bar under its header (docs/adr/0032) */
  compactOnDesktop: boolean;


  /** Calendared: property that holds a note's sticker emoji (see docs/spec/stickers.md) */
  stickerProperty: string;
  /** Calendared: turns the whole sticker feature on/off (display, header button, menu item, commands) */
  stickersEnabled: boolean;
  /** Calendared: show the sticker button in the header of periodic notes */
  stickerHeaderButton: boolean;
  /** Calendared: show the Open now button in the header of every note (docs/adr/0030) */
  openNowHeaderButton: boolean;

  /** Calendared: the format or sticker property a change left behind, while the settings point to the migration (docs/adr/0035) */
  migrationNotices: MigrationNotices;

  /** Whether to show a confirmation dialog before creating a new note */
  shouldConfirmBeforeCreate: boolean;

  /** Starting year for the year range selector */
  yearsRangesStart: 2020;

  /** Locale and display settings */
  localeSettings: {
    /** Override for the default locale */
    localeOverride: string;

    /** ID of the day to start the week (0 for Sunday, 1 for Monday, etc.). Calendared: only 6, 0 or 1 (Sat, Sun, Mon) */
    weekStartId: number;
  };
}

export function getDefaultPeriodicNotesConfig(
  granularity: IGranularity,
): PeriodSettings {
  return {
    enabled: granularity === "day" || granularity === 'week',
    openAtStartup: false,

    format: DEFAULT_FORMATS_PER_GRANULARITY[granularity],
    templatePath: "",
    folder: "/",
  } satisfies PeriodSettings
}

/**
 * Calendared: settings of removed features (preview panel, floating mode, minimal-mode toggle, natural language
 * date picker, TODO carry-over, calendar auto-sync toggle, popover closing options). Dropped from data.json on load so they
 * don't linger.
 */
export const REMOVED_SETTINGS = [
  "preview",
  "floatingMode",
  "minimalMode",
  "floatingViewAlwaysMinimal",
  "openPopoverOnRibbonHover",
  "crrNldModalGranularity",
  "crrNldModalgranularityInputVal",
  "syncCalendar",
  // Calendared: the list of periodic notes, now counted from the vault when the settings show it (docs/adr/0016)
  "filepaths",
  "filepathsByFormatValue",
  // Calendared: an unreleased toggle for the emoji search language; installed languages are now the files in the plugin's folder
  "emojiSearchInLanguage",
  "popoversClosing",
  "autoHoverPreview",
  // Calendared: confirmations for deleting a format and renaming notes to it (docs/adr/0019), and for moving and deleting
  // notes from the list of a format's notes, which is now read-only (docs/adr/0022)
  "shouldConfirmBeforeDeleteFormat",
  "shouldConfirmBeforeReplaceAllFormats",
  "shouldConfirmBeforeMoveFile",
  "shouldConfirmBeforeMoveAllFiles",
  "shouldConfirmBeforeDeleteFile",
  "shouldConfirmBeforeDeleteAllFiles",
] as const;
/** Calendared: per-period settings of removed features (`periods.<granularity>.preview`: TODO / preview sections) */
export const REMOVED_PERIOD_SETTINGS = ["preview"] as const;

export const DEFAULT_SETTINGS: ISettings = Object.freeze({
  periods: Object.fromEntries(granularities.map(
    g => [g, getDefaultPeriodicNotesConfig(g)],
  )) as Record<IGranularity, PeriodSettings>,
  breadcrumbs: DEFAULT_BREADCRUMBS,
  miniCalendar: DEFAULT_MINI_CALENDAR,
  compactOnDesktop: false,
  stickerProperty: "sticker",
  stickersEnabled: true,
  stickerHeaderButton: true,
  openNowHeaderButton: true,
  shouldConfirmBeforeCreate: true,
  migrationNotices: NO_MIGRATION_NOTICES,
  yearsRangesStart: 2020,

  localeSettings: {
    localeOverride: sysLocaleKey,
    weekStartId: toSupportedWeekStart(sysWeekStartId),
  },
});
