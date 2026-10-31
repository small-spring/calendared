import { DEFAULT_FORMATS_PER_GRANULARITY } from "@/constants";
import { type IGranularity } from "@/io";

type SavedFormat = { value?: unknown };

/**
 * Calendared: saved settings from when a period had a list of formats (one for new notes, the others to read existing
 * notes) become the one format a period has now (docs/adr/0019): the one used for new notes is kept
 */
export function migrateFormatSettings(saved: Record<string, unknown>): Record<string, unknown> {
    const periods = saved.periods as Record<string, Record<string, unknown>> | undefined;
    if (!periods) return saved;

    const migrated: Record<string, Record<string, unknown>> = {};
    for (const [granularity, period] of Object.entries(periods)) {
        if (!("selectedFormat" in period) && !("formats" in period)) {
            migrated[granularity] = period;
            continue;
        }
        const { selectedFormat, formats, ...rest } = period as { selectedFormat?: SavedFormat; formats?: Record<string, SavedFormat> };
        const candidates = [selectedFormat, ...Object.values(formats ?? {})].map((f) => f?.value);
        const kept = candidates.find((value): value is string => typeof value === "string" && !!value.trim());
        migrated[granularity] = { ...rest, format: kept ?? DEFAULT_FORMATS_PER_GRANULARITY[granularity as IGranularity] };
    }
    return { ...saved, periods: migrated };
}
