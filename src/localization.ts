import { getLanguage } from "obsidian";
import { localeWeekStart, obsidianMomentLocale } from "./calendar-locale";

export const defaultWeekdays = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday'
];

/** Calendared: Obsidian's language, as a moment language: the calendar's default language (docs/adr/0046) */
export const obsidianLocaleKey = obsidianMomentLocale(getLanguage(), window.moment.locales());
export const obsidianWeekStartId = localeWeekStart(obsidianLocaleKey);
