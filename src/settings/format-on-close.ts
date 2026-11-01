import { granularities } from "@/constants";
import type { IGranularity } from "@/io";
import { validateFormat } from "@/io/validation";
import type { PeriodSettings } from "./constants";

// Calendared: what the settings check about formats when they close

/**
 * The periods whose format is empty or invalid, to be replaced with the default so creating a note always has a valid
 * format. Turned-off periods are left as they are: their format still finds the notes you already have
 */
export function formatsToReset(periods: Record<IGranularity, Pick<PeriodSettings, "enabled" | "format">>): IGranularity[] {
  return granularities.filter((g) => {
    const { enabled, format } = periods[g];
    return enabled && (!format.trim() || !!validateFormat(format, g));
  });
}
