import { settingsStore } from "@/settings";
import { capitalize } from "@/utils";
import { get } from "svelte/store";
import { getPeriodicityFromGranularity } from "../parse";
import { type IGranularity } from "../types";
import { DUP_ERROR_PREFIX } from "./constants";
import { weekSchemeFor } from "@/weeks";
import { disallowedTokens } from "@/format-tokens";

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

export const isTokenEffective = (value: string, token: string) => {
  const isEffective = (startIndex: number, foundOpeningBracket: boolean) => {
    let _foundOpeningBracket = foundOpeningBracket;
    let tokenFound = false;
    let tokenFoundIndex = -1;

    for (let i = startIndex; i < value.length; i++) {
      if (value[i] === "[") {
        if (!_foundOpeningBracket && !tokenFound) {
          _foundOpeningBracket = true;
          continue;
        }
        if (_foundOpeningBracket && tokenFound) {
          return {
            isEffective: true,
            effectiveTokenIndex: tokenFoundIndex,
          };
        }
      }

      if (value[i] === token) {
        tokenFound = true;
        tokenFoundIndex = i

        if (
          !value.slice(i + 1).includes("]") &&
          !value.slice(i + 1).includes("[")
        ) {
          return {
            isEffective: true,
            effectiveTokenIndex: tokenFoundIndex
          };
        }


        if (!_foundOpeningBracket) {
          return {
            isEffective: true,
            effectiveTokenIndex: tokenFoundIndex
          };
        } else {
          continue;
        }
      }

      if (value[i] === "]" && _foundOpeningBracket && tokenFound) {
        return isEffective(i + 1, true);
      }
    }
  };

  return isEffective(0, false);
}

function isAmbiguousFormat(
  value: string,
  currentDate: moment.Moment,
  parsedDate: moment.Moment,
  granularity: IGranularity,
): string | null {
  const errorMessage = "Ambiguous format.";

  const containsValidToken = (tokens: string[]) => {
    return tokens.some((token) => isTokenEffective(value, token)?.isEffective);
  }

  // Check for missing essential information based on granularity
  const missingInfo = (() => {
    if (containsValidToken(["x", "X"])) return null;
    if (containsValidToken(["l", "L"]) && value !== "LT" && value !== "LTS") return null;
    // Calendared: G (ISO week-based year) is allowed again. Upstream dropped it as "ambiguous for some dates": its week
    // check compared moment's language weeks and calendar years, which don't match ISO weeks around New Year
    if (!containsValidToken(["Y", "y", "g", "G"])) return "year (Y, y, gg or GG)";

    switch (granularity) {
      case "quarter":
        if (!containsValidToken(["Q"])) return "quarter (Q)";
        break;
      case "month":
        if (!containsValidToken(["M"])) return "month (M)";
        break;
      case "week":
        if (!containsValidToken(["w", "W"])) return "week (w or W)";
        break;
      case "day":
        if (!containsValidToken(["M"])) return "month (M)";
        if (!containsValidToken(["D"])) return "day (D)";
        break;
    }
    return null;
  })();

  if (missingInfo) {
    return `${errorMessage} Missing ${missingInfo} info. Can't uniquely identify ${granularity}.`;
  }

  switch (granularity) {
    case "year":
      if (parsedDate.year() !== currentDate.year()) {
        return `${errorMessage} It doesn't uniquely identify a year.
                    Current year: ${currentDate.year()}, Parsed year: ${parsedDate.year()}`;
      }
      break;
    case "quarter": {
      // Calendared: checks the format can be read back, with moment's own quarters: calendar on purpose
      const [parsedQ, currentQ] = [parsedDate.quarter(), currentDate.quarter()]; // calendar on purpose
      if (parsedQ !== currentQ || parsedDate.year() !== currentDate.year()) {
        return `${errorMessage} It doesn't uniquely identify a quarter.
                    Current: Q${currentQ} ${currentDate.year()}, Parsed: Q${parsedQ} ${parsedDate.year()}`;
      }
      break;
    }
    case "month":
      if (
        parsedDate.month() !== currentDate.month() ||
        parsedDate.year() !== currentDate.year()
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
    // default:
    //   return errorMessage + `Unknown granularity: ${granularity} `;
  }

  return null;
}

// Calendared: a period has one format (docs/adr/0019), so a duplicate is another period's format
function checkIfDuplicateFormat(
  value: string,
  granularity: IGranularity,
) {
  const periods = get(settingsStore).periods
  for (const [g, periodSettings] of Object.entries(periods)) {
    if (g !== granularity && periodSettings.format === value) {
      return {
        duplicate: true,
        errorMsg: `${DUP_ERROR_PREFIX} from ${capitalize(getPeriodicityFromGranularity(g as IGranularity))} Notes settings`,
      };
    }
  }

  return { duplicte: false, errorMsg: "" };
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

  // check for duplicated valid formats
  const { duplicate, errorMsg } = checkIfDuplicateFormat(value, granularity);
  if (duplicate) {
    error = errorMsg;
    return error;
  }

  return error;
}
