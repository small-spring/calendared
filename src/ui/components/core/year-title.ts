// Calendared: the title of a yearly note as the calendar's headers and the month picker show it
import { noteAt } from "@/io";
import { crumbText } from "@/navigation";
import type { PeriodRules } from "@/periods";
import type { ISettings } from "@/settings";
import type { TTitle } from "./PeriodTitle.svelte";

/**
 * The year that starts on `yearStart`: its note, and its name by its own start month ("2026–27" if it isn't January,
 * docs/adr/0039). Read while rendering with `$settingsStore`, it follows the settings and the vault (docs/adr/0016)
 */
export function yearTitle(
  yearStart: moment.Moment,
  settings: Pick<ISettings, "periods" | "localeSettings" | "stickersEnabled" | "stickerProperty">,
  rules: PeriodRules,
): TTitle {
  return {
    granularity: "year",
    fileData: noteAt("year", yearStart, settings),
    // Calendared: upstream used "YY" (e.g. "26")
    formatValue: "YYYY",
    text: crumbText("year", yearStart, settings.localeSettings.localeOverride, rules),
  };
}
