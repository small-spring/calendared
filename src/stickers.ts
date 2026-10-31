// Calendared: reading a note's sticker (docs/spec/stickers.md). The settings are arguments, so a caller that reads them
// reactively recomputes when they change (docs/adr/0016); writing stickers stays in ui/utils/emoji-picker.ts
import emojiRegex from "emoji-regex";
import type { CachedMetadata } from "obsidian";

/** Calendared: a note's sticker (one emoji kept in the sticker property; see docs/spec/stickers.md) */
export type TSticker = { emoji: string };

function asEmoji(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.match(emojiRegex())?.[0] === trimmed ? trimmed : null;
}

/**
 * Calendared: properties Obsidian itself gives meaning to (including the old singular names).
 * Stickers overwrite their property's value, so using one of these would wipe the user's tags, aliases or CSS classes.
 */
export const RESERVED_STICKER_PROPERTIES = ["tags", "tag", "aliases", "alias", "cssclasses", "cssclass"];

export function isReservedStickerProperty(property: string): boolean {
  return RESERVED_STICKER_PROPERTIES.includes(property.trim().toLowerCase());
}

/** Calendared: the property stickers live in (setting `stickerProperty`, default "sticker"); never a reserved one */
export function stickerProperty(setting: string | undefined): string {
  const property = setting?.trim();
  return property && !isReservedStickerProperty(property) ? property : "sticker";
}

/**
 * Calendared: a note's sticker, read only from the sticker property (e.g. `sticker: 👍`).
 * If the property holds a list (e.g. edited by hand), its first single-emoji item is used.
 * With stickers turned off in the settings, no note has one as far as the plugin is concerned.
 * Upstream stored stickers as `#prefix+emoji` tags in the body; those are no longer read.
 */
export function stickerFrom(
  cache: CachedMetadata | null | undefined,
  settings: { stickersEnabled: boolean; stickerProperty?: string },
): TSticker | null {
  if (!settings.stickersEnabled) return null;

  const emoji = stickerFromValue(cache?.frontmatter?.[stickerProperty(settings.stickerProperty)]);
  return emoji ? { emoji } : null;
}

/** Calendared: the emoji a property's value shows as a sticker: a single emoji, or a list's first single-emoji item; else null */
export function stickerFromValue(value: unknown): string | null {
  return Array.isArray(value) ? value.map(asEmoji).find((e) => e !== null) ?? null : asEmoji(value);
}
