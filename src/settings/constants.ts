import { DEFAULT_FORMATS_PER_GRANULARITY, granularities } from "@/constants";
import { type IGranularity } from "@/io";
import { sysLocaleKey, sysWeekStartId } from "../localization";
import { toSupportedWeekStart } from "../weeks";
import { v4 as uuidv4 } from "uuid";

export type TFormat = {
  id: string;
  value: string;
  error: string;
  loading: boolean;
}
export type TimelineViewMode = 'expanded' | 'collapsed';
export interface PeriodSettings {
  enabled: boolean;
  openAtStartup: boolean;

  selectedFormat: TFormat;
  formats: Record<string, TFormat>;
  folder: string;
  templatePath: string;
}

export interface ISettings {
  periods: Record<IGranularity, PeriodSettings>;
  timeline: {
    enabled: boolean;
    /** Whether the adjacent dates will be based in the crr file granularity or if they'll always be adjacent days. */
    granularityBased: boolean;
    displayOnRestNotes: boolean;
    displayStickers: boolean;
    viewMode: TimelineViewMode;
    restViewMode: TimelineViewMode;
  };


  /** Calendared: property that holds a note's sticker emoji (see docs/stickers.md) */
  stickerProperty: string;
  /** Calendared: turns the whole sticker feature on/off (display, header button, menu item, commands) */
  stickersEnabled: boolean;
  /** Calendared: show the sticker button in the header of periodic notes */
  stickerHeaderButton: boolean;

  /** Whether to show a confirmation dialog before creating a new note */
  shouldConfirmBeforeCreate: boolean;

  /** Whether to show a confirmation dialog before deleting a format on "Notes" settings tab */
  shouldConfirmBeforeDeleteFormat: boolean;

  /** Whether to show a confirmation dialog before replacing all formats with selected one on "Notes" settings tab */
  shouldConfirmBeforeReplaceAllFormats: boolean;

  shouldConfirmBeforeMoveFile: boolean;
  shouldConfirmBeforeMoveAllFiles: boolean;
  shouldConfirmBeforeDeleteFile: boolean;
  shouldConfirmBeforeDeleteAllFiles: boolean;

  /** Starting year for the year range selector */
  yearsRangesStart: 2020;

  /** Whether to automatically preview notes on hover */
  autoHoverPreview: boolean;

  /** Locale and display settings */
  localeSettings: {
    /** Override for the default locale */
    localeOverride: string;

    /** ID of the day to start the week (0 for Sunday, 1 for Monday, etc.). Calendared: only 6, 0 or 1 (Sat, Sun, Mon) */
    weekStartId: number;

    /** Calendared: how weeks are numbered (docs/periods.md, ADR-006). Only "iso" exists so far; not shown in the settings */
    weekNumbering: "iso";
  };

  /** Settings for closing popovers */
  popoversClosing: {
    /** Whether to close popovers one by one when clicking outside */
    closePopoversOneByOneOnClickOut: boolean;

    /** Whether to close popovers one by one when pressing Esc */
    closePopoversOneByOneOnEscKeydown: boolean;

    /** Close popovers when pressing Esc in the search input instead of default blur*/
    closeOnEscStickerSearchInput: boolean;
  };
}

export function getDefaultPeriodicNotesConfig(
  granularity: IGranularity,
): PeriodSettings {
  const id = uuidv4();
  const selectedFormat = {
    id,
    value: DEFAULT_FORMATS_PER_GRANULARITY[granularity],
    error: "",
    loading: false,
  }

  return {
    enabled: granularity === "day" || granularity === 'week',
    openAtStartup: false,

    selectedFormat,
    formats: { [id]: selectedFormat },
    templatePath: "",
    folder: "/",
  } satisfies PeriodSettings
}

/**
 * Calendared: settings of removed features (preview panel, floating mode, minimal-mode toggle, natural language
 * date picker, TODO carry-over, calendar auto-sync toggle). Dropped from data.json on load so they don't linger.
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
  // Calendared: the list of periodic notes, now counted from the vault when the settings show it (docs/state.md, ADR-S2)
  "filepaths",
  "filepathsByFormatValue",
  // Calendared: an unreleased toggle for the emoji search language; installed languages are now the files in the plugin's folder
  "emojiSearchInLanguage",
] as const;
/** Calendared: per-period settings of removed features (`periods.<granularity>.preview`: TODO / preview sections) */
export const REMOVED_PERIOD_SETTINGS = ["preview"] as const;

export const DEFAULT_SETTINGS: ISettings = Object.freeze({
  periods: Object.fromEntries(granularities.map(
    g => [g, getDefaultPeriodicNotesConfig(g)],
  )) as Record<IGranularity, PeriodSettings>,
  timeline: {
    enabled: true,
    granularityBased: true,
    displayOnRestNotes: false,
    displayStickers: true,
    viewMode: 'expanded' as const,
    restViewMode: 'collapsed' as const,
  },
  stickerProperty: "sticker",
  stickersEnabled: true,
  stickerHeaderButton: true,
  shouldConfirmBeforeCreate: true,
  shouldConfirmBeforeDeleteFormat: true,
  shouldConfirmBeforeReplaceAllFormats: true,
  shouldConfirmBeforeMoveFile: true,
  shouldConfirmBeforeMoveAllFiles: true,
  shouldConfirmBeforeDeleteFile: true,
  shouldConfirmBeforeDeleteAllFiles: true,
  yearsRangesStart: 2020,
  autoHoverPreview: false,

  localeSettings: {
    localeOverride: sysLocaleKey,
    weekStartId: toSupportedWeekStart(sysWeekStartId),
    weekNumbering: "iso" as const,
  },

  popoversClosing: {
    closePopoversOneByOneOnClickOut: false,
    closePopoversOneByOneOnEscKeydown: true,
    closeOnEscStickerSearchInput: true,
  },
});
