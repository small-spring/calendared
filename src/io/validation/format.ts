import { settingsStore } from "@/settings";
import { get } from "svelte/store";
import { getPeriodicityFromGranularity } from "../parse";
import { type IGranularity } from "../types";
import { weekSchemeFor } from "@/weeks";
import { disallowedTokens, missingTokens } from "@/format-tokens";

// https://github.com/liamcain/obsidian-periodic-notes/blob/a8aa7e4e368ac344282b17e381b9101af12af0d1/src/settings/validation.ts#L20
function validateFilename(filename: string): boolean {
  const illegalRe = /[?<>\\:*|"]/g;
  /* eslint-disable-next-line no-control-regex --
   * this regex is neccesary as one of the function's explicit purposes is to detect and disallow control characters in 
   * filenames. 
   **/
  const controlRe = /[\x00-\x1f\x80-\x9f]/g;
  const reservedRe = /^\.+$/;
  const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

  return (
    !illegalRe.test(filename) &&
    !controlRe.test(filename) &&
    !reservedRe.test(filename) &&
    !windowsReservedRe.test(filename)
  );
}

function isAmbiguousFormat(
  value: string,
  currentDate: moment.Moment,
  parsedDate: moment.Moment,
  granularity: IGranularity,
): string | null {
  const errorMessage = "Ambiguous format.";

  // Calendared: read with the format's tokens, so text in [brackets] doesn't count (docs/adr/0041)
  const missingInfo = missingTokens(value, granularity);

  if (missingInfo) {
    return `${errorMessage} Missing ${missingInfo} info. Can't uniquely identify ${granularity}.`;
  }

  // Calendared: checks the format can be read back, with moment's own quarters and years: calendar on purpose
  const [parsedYear, currentYear] = [parsedDate.year(), currentDate.year()]; // calendar on purpose
  switch (granularity) {
    case "year":
      if (parsedYear !== currentYear) {
        return `${errorMessage} It doesn't uniquely identify a year.
                    Current year: ${currentYear}, Parsed year: ${parsedYear}`;
      }
      break;
    case "quarter": {
      const [parsedQ, currentQ] = [parsedDate.quarter(), currentDate.quarter()]; // calendar on purpose
      if (parsedQ !== currentQ || parsedYear !== currentYear) {
        return `${errorMessage} It doesn't uniquely identify a quarter.
                    Current: Q${currentQ} ${currentYear}, Parsed: Q${parsedQ} ${parsedYear}`;
      }
      break;
    }
    case "month":
      if (
        parsedDate.month() !== currentDate.month() ||
        parsedYear !== currentYear
      ) {
        return `${errorMessage} It doesn't uniquely identify a month. 
                    Current: ${currentDate.format("MMMM YYYY")}, Parsed: ${parsedDate.format("MMMM YYYY")
          }`;
      }
      break;
    case "week": {
      // Calendared: weeks are the calendar's rows, named by the week scheme (docs/spec/periods.md). This week's name must read
      // back as this week. Formats that only break around New Year are warned about in the settings, not rejected here
      const weeks = weekSchemeFor(get(settingsStore).localeSettings);
      const week = weeks.weekOf(currentDate);
      const name = weeks.format(week, value);
      const readBack = weeks.parse(name, value);
      if (!readBack || readBack.weekYear !== week.weekYear || readBack.week !== week.week) {
        return `${errorMessage} It doesn't uniquely identify a week. This week is written "${name}", which doesn't read back as it.`;
      }
      break;
    }
    case "day":
      if (!parsedDate.isSame(currentDate, "day")) {
        return `${errorMessage} It doesn't uniquely identify a day. 
                    Current: ${currentDate.format("YYYY-MM-DD")}, Parsed: ${parsedDate.format("YYYY-MM-DD")
          } `;
      }
      break;
  }

  return null;
}

/** What a period's names may contain, shown with the error (docs/adr/0040) */
const ALLOWED_HINT: Record<IGranularity, string> = {
  day: "Use the year, month and day (or the ISO week-based year, week and weekday together).",
  week: "Use the week-based year (GGGG) and week (WW).",
  month: "Use the year and month.",
  quarter: "Use the year and quarter (Q).",
  year: "Use the year.",
};

export function validateFormat(
  value: string,
  granularity: IGranularity,
): string {
  let error = "";

  if (!value) {
    error = "";
    return error;
  }

  if (!validateFilename(value)) {
    error = "Format contains illegal characters";
    return error;
  }

  // Calendared: only tokens of the periods that contain the whole period (docs/adr/0040)
  const disallowed = disallowedTokens(value, granularity);
  if (disallowed.length) {
    return `${disallowed.join(", ")} can't be used in ${getPeriodicityFromGranularity(granularity)} note names. ${ALLOWED_HINT[granularity]}`;
  }

  const currentDate = window.moment();
  const formattedDate = window.moment().format(value);
  let parsedDate = window.moment(formattedDate, value, true);
  if (granularity === 'week') {
    // moment wrongly parses some formatted dates containing week numbers,
    // omitting this parsing step fixes the issue, I don't think it'll bring any new bug
    // there are a couple of extra checks down the line to make sure the format is valid
    parsedDate = window.moment();
  }

  // Check for ambiguous formats
  const ambiguityError = isAmbiguousFormat(
    value,
    currentDate,
    parsedDate,
    granularity,
  );
  if (ambiguityError) {
    return ambiguityError;
  }

  // check if the date is valid
  if (!parsedDate.isValid()) {
    error = "Format is not valid";
    return error;
  }

  // Calendared: no check against other periods' formats. A valid format can't be valid for another period, as each
  // period's names need tokens the others can't use (docs/adr/0040)

  return error;
}
