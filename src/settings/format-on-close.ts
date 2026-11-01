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

/** The format fields' saves still waiting for typing to stop */
const pendingEdits = new Set<() => void>();

/**
 * Lets the settings save a format field's last edit before they check the formats on close; the field saves 0.5 s after
 * typing stops, which could come after the check and keep an invalid format. Returns the untrack, for when the field goes
 */
export function trackPendingEdit(save: () => void): () => void {
  pendingEdits.add(save);
  return () => pendingEdits.delete(save);
}

/** Saves the edits the format fields haven't saved yet */
export function savePendingEdits() {
  for (const save of [...pendingEdits]) save();
}
