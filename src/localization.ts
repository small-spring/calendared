import locales from './locales';


export const defaultWeekdays = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday'
];

export const sysLocaleKey =
	navigator.languages.find((locale) => locales.has(locale.toLocaleLowerCase())) ||
	navigator.languages[0];

const sysLocaleMoment = window.moment().clone().locale(sysLocaleKey);
export const sysWeekStartId = sysLocaleMoment.localeData().firstDayOfWeek();
