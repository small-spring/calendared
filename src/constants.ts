import { type IGranularity } from "./io";

export const CALENDAR_LUCIDE_ICON = 'calendar-days';
export const LEAF_TYPE = 'periodic-notes-calendar-view';
/** Calendared: marks a tab's breadcrumbs and mini calendar (app.css places them on phones) */
export const NAVIGATION_TYPE = 'calendared-navigation';
export const granularities = ['day', 'week', 'month', 'quarter', 'year'] as const;
export const granularitiesCapitalize = ['Day', 'Week', 'Month', 'Quarter', 'Year'] as const;

export const YEARS_RANGE_SIZE = 12

export const STICKER_TAG_PREFIX = '#sticker-';

export const STICKER_PICKER_ID = 'sticker-picker';

export const MODAL_CLASS = 'modal';

export const DEFAULT_DAILY_NOTE_FORMAT = "YYYY-MM-DD";
// Calendared: ISO week-based year and week (docs/adr/0012). Upstream: "YYYY-[W]ww"
export const DEFAULT_WEEKLY_NOTE_FORMAT = "GGGG-[W]WW";
export const DEFAULT_MONTHLY_NOTE_FORMAT = "YYYY-MM";
export const DEFAULT_QUARTERLY_NOTE_FORMAT = "YYYY-[Q]Q";
export const DEFAULT_YEARLY_NOTE_FORMAT = "YYYY";

export const DEFAULT_FORMATS = {
    daily: DEFAULT_DAILY_NOTE_FORMAT,
    weekly: DEFAULT_WEEKLY_NOTE_FORMAT,
    monthly: DEFAULT_MONTHLY_NOTE_FORMAT,
    quarterly: DEFAULT_QUARTERLY_NOTE_FORMAT,
    yearly: DEFAULT_YEARLY_NOTE_FORMAT,
};
export const DEFAULT_FORMATS_PER_GRANULARITY: Record<IGranularity, string> = {
    day: DEFAULT_DAILY_NOTE_FORMAT,
    week: DEFAULT_WEEKLY_NOTE_FORMAT,
    month: DEFAULT_MONTHLY_NOTE_FORMAT,
    quarter: DEFAULT_QUARTERLY_NOTE_FORMAT,
    year: DEFAULT_YEARLY_NOTE_FORMAT,
};
export const DAILY_NOTES_PLUGIN_ID = 'daily-notes'
