import type { WeekScheme } from '@/weeks';
import type { IGranularity, IPeriodicity } from './types';


export function getPeriodicityFromGranularity(granularity: IGranularity): IPeriodicity {
  return granularity === 'day' ? 'daily' : `${granularity}ly`;
}

const REGEX = (function generateRegex(): RegExp {
  const staticParts = ['title', 'date', 'time', 'currentdate', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const allParts = [...staticParts];

  return new RegExp(`{{\\s*(${allParts.join("|")}|[^-+:}]+)(([+-])\\s*(\\d+)\\s*([yQMwWdhms])\\s*)?:?([^}]+)?}}`, "gi")
})()

/**
 * Replaces date and time placeholders in a template string with formatted date strings.
 * 
 * This function supports various date-related placeholders and allows for date adjustments
 * and custom formatting. It's designed to be flexible and handle a wide range of date and
 * time representation needs in templates.
 * 
 * Supported placeholders:
 * - {{title}}: The main date (usually the note's date)
 * - {{date}}: Same as title
 * - {{time}}: The current time
 * - {{currentDate}}: The current date and time
 * - {{weekday}}: Any day of the week (e.g., {{monday}}, {{tuesday}}, etc.)
 * 
 * Each placeholder supports:
 * - Date adjustments: e.g., {{date+1d}}, {{monday-1w}}
 * - Custom formatting: e.g., {{date:YYYY-MM-DD}}, {{time:HH:mm:ss}}
 * 
 * Examples:
 * - Title: {{title}}
 * - Date: {{date}}
 * - Current time: {{time}}
 * - Current date: {{currentDAte:LLLL}}
 * - Sunday: {{sunday}}
 * - Crr Week: {{date:w}}
 * - Prev Monday: {{monday-1w:LLLL}}
 * 
 * @param granularity The granularity of the note (day, week, month, quarter, year)
 * @param date The main date to use for replacements
 * @param defaultFormat The default format to use when no custom format is specified
 * @param template The template string containing placeholders to be replaced
 * @returns The template string with all placeholders replaced by formatted date strings
 */
export function replaceTemplateContents(
  date: moment.Moment,
  defaultFormat: string,
  template: string,
  weeks: WeekScheme,
): string {
  const now = window.moment();
  // Calendared: weekdays are taken from the note's week as the calendar shows it (the week scheme's row,
  // docs/periods.md). Upstream used moment's language week start (Sunday in Japanese)
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const rowStart = weeks.rangeOf(weeks.weekOf(date))!.start;

  return template.replace(REGEX,
    (match, type: string | undefined | null) => {
      if (!type) {
        return match
      }

      let momentDate: moment.Moment | null = null;
      let modifiedDefaultFormat = defaultFormat;

      const minusIndex = match.indexOf('-');
      const plusIndex = match.indexOf('-');
      const colonIndex = match.indexOf(':');
      let delta = "";
      let unit = "";
      let format = "";

      if ((match.includes('+') && (colonIndex === -1 || plusIndex < colonIndex)) || (match.includes('-') && (colonIndex === -1 || minusIndex < colonIndex))) {
        const pattern = `([+-])\\s*(\\d+)\\s*([yQMwWdhms])\\s*`
        const [, _symbol, _amount, _unit] = match.match(new RegExp(pattern, 'i')) || []
        delta = `${_symbol}${_amount}`
        unit = _unit
      }
      if (match.includes(':')) {
        const pattern = `:([^}]+)`
        const [, _format] = match.match(new RegExp(pattern, 'i')) || []
        format = _format?.trim() || ""
      }

      switch (type.toLowerCase()) {
        case 'title':
        case 'date':
          momentDate = date.clone();
          break;

        case 'time':
          momentDate = now.clone();
          modifiedDefaultFormat = 'HH:mm';
          break;

        case 'currentdate':
          momentDate = now.clone();
          break;

        default:
          if (weekdays.includes(type.toLowerCase())) {
            // handle weekdays
            const day = weekdays.indexOf(type.toLowerCase());
            momentDate = rowStart.clone().add((day - rowStart.day() + 7) % 7, 'days');
          } else {
            return match; // Return unchanged if not recognized
          }
          break;
      }


      if (delta && unit) {
        momentDate.add(parseInt(delta, 10), unit as moment.DurationInputArg2);
      }

      return momentDate.format(
        format || modifiedDefaultFormat
      );
    }
  );
}
