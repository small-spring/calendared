import { granularities } from "@/constants";
import type { IGranularity } from "@/io/types";

/**
 * Calendared: the format (per period) and sticker property a change left behind, kept only while the settings show the
 * notice that points to the migration (docs/adr/0035). Forgotten once no note uses it, or when told to keep the notes as they are
 */
export type MigrationNotices = {
  formats: Partial<Record<IGranularity, string>>;
  stickerProperty: string | null;
};

export const NO_MIGRATION_NOTICES: MigrationNotices = Object.freeze({ formats: {}, stickerProperty: null });

type Tracked = { periods: Record<IGranularity, { format: string }>; stickerProperty: string };

/**
 * The notices after the settings changed from `before` to `after`. A changed format is remembered as it was before; while a
 * notice is up, the earliest one is kept (the notes still use it), and changing back to it forgets it.
 * Returns `notices` itself when nothing changed
 */
export function trackSettingChanges(notices: MigrationNotices, before: Tracked, after: Tracked): MigrationNotices {
  let formats = notices.formats;
  for (const granularity of granularities) {
    const previous = before.periods[granularity].format.trim();
    const current = after.periods[granularity].format.trim();
    if (previous === current) continue;
    const { [granularity]: kept, ...others } = formats;
    const earliest = kept ?? previous;
    formats = earliest === current ? others : { ...others, [granularity]: earliest };
  }

  let stickerProperty = notices.stickerProperty;
  const previous = before.stickerProperty.trim();
  const current = after.stickerProperty.trim();
  if (previous !== current) {
    const earliest = stickerProperty ?? previous;
    stickerProperty = earliest === current ? null : earliest;
  }

  return formats === notices.formats && stickerProperty === notices.stickerProperty ? notices : { formats, stickerProperty };
}
