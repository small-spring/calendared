import { TFileData } from "@/io";
import { settingsStore } from "@/settings";
import { getEmojiPickerLocale } from "./emoji-locale";
import { Picker } from "emoji-mart";
import emojiRegex from "emoji-regex";
import { type CachedMetadata, type TFile } from "obsidian";
import { get } from "svelte/store";
import { Popover } from "../popovers";
import { PluginService } from "@/app-service";
import { spFileDataStore } from "@/stores/popovers";

type TEmoji = {
  aliases?: string[],
  id: string,
  keywords: string[],
  name: string,
  native: string,
  shortcodes: string,
  skin?: number,
  unified: string,
}
/** Calendared: a note's sticker (one emoji kept in the sticker property; see docs/stickers.md) */
export type TSticker = { emoji: string }

export const onInputKeydown = (ev: KeyboardEvent) => {
  const input = document.querySelector('em-emoji-picker')?.shadowRoot?.querySelector('input');
  const settings = get(settingsStore);
  const stickerInstance = Popover.stickerSingleton;

  if (ev.key === 'Escape') {
    if (settings.popoversClosing.closePopoversOneByOneOnEscKeydown) {
      if (input) {
        input.blur();
      }
      stickerInstance?.close()
    } else {
      Popover.closeAll()
    }
    stickerInstance?.behaviors?.refHtmlEl?.focus();
  }
};

export function initializePicker(
  container: HTMLElement,
  theme: "light" | "dark" | null,
  fileData: TFileData
) {
  const pickerOptions = {
    // Calendared: data with keywords in Obsidian's language, and the picker's own text in that language
    ...getEmojiPickerLocale(),
    onEmojiSelect: async (emoji: TEmoji) => {
      const stickerInstance = Popover.stickerSingleton;
      stickerInstance?.close()

      // Calendared: read the target note now rather than from `fileData` captured when the picker was built,
      // so the sticker always goes to the note the picker was opened for
      const file = get(spFileDataStore)?.file ?? fileData.file;
      if (file) {
        await setSticker(file, emoji.native);
      }
    },
    autoFocus: true,
    emojiButtonColors: ['color-mix(in srgb, var(--interactive-accent) 20%, transparent)'],
    theme,
  };

  // Calendared: emoji-mart registers <em-emoji-picker> only if the name is free. After the plugin is turned off and on
  // (without restarting Obsidian) the window still holds the class from the earlier load, and constructing this bundle's
  // unregistered `Picker` throws "Illegal constructor". Use whichever class is actually registered.
  const RegisteredPicker = (customElements.get("em-emoji-picker") as typeof Picker | undefined) ?? Picker;
  const pickerEl = new RegisteredPicker(pickerOptions);
  const style = getComputedStyle(document.body)
  const h = parseInt(style.getPropertyValue('--accent-h'));
  const s = parseInt(style.getPropertyValue('--accent-s'));
  const l = parseInt(style.getPropertyValue('--accent-l'));

  const accentRgb = hslToRgb(h / 360, s / 100, l / 100)
  // Calendared: the picker sits inside the sticker popover's box (StickerPopover.svelte), which draws the border,
  // corners and shadow. Give the picker the box's background (Obsidian's) and drop its own frame so they read as one
  pickerEl.injectStyles(`
        section#root {
            font-family: var(--font-interface);
            font-weight: 400 !important;
            --rgb-background: ${cssColorToRgb("var(--background-primary)").join(", ")};
            border-radius: 0;
            box-shadow: none;
            --rgb-accent: ${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]};
            --color-a: var(--interactive-accent-hover);
            --color-b: var(--text-muted);
        }
        .sticky {
            font-weight: 400!important;
        }
    `);

  const pickerHtmlEl = pickerEl as unknown as HTMLElement
  if (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  container.appendChild(pickerHtmlEl);

  handleMutationObserver(pickerHtmlEl.shadowRoot);
}

function handleMutationObserver(shadowRoot: ShadowRoot | null) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(() => {
      const input = shadowRoot?.querySelector('input');

      if (input) {
        input.addEventListener('keydown', onInputKeydown, true);

        // Stop observing once the element is found
        observer.disconnect();
      }
    });
  });

  // Start observing changes in the shadow DOM
  if (shadowRoot) {
    observer.observe(shadowRoot, { subtree: true, childList: true });
  }
}

/**
 * Calendared: resolve a CSS color (e.g. `var(--background-primary)`) to `[r, g, b]`,
 * for emoji-mart, which takes colors as `--rgb-*` triplets
 */
function cssColorToRgb(color: string): [number, number, number] {
  const probe = document.body.createDiv();
  probe.style.color = color;
  const [r = 0, g = 0, b = 0] = (getComputedStyle(probe).color.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  probe.remove();
  return [r, g, b];
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from https://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
function hslToRgb(h: number, s: number, l: number): Array<number> {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hueToRgb(p: number, q: number, t: number) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/** The emoji if `value` is exactly one emoji */
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
export function getStickerProperty(): string {
  const property = get(settingsStore).stickerProperty?.trim();
  return property && !isReservedStickerProperty(property) ? property : "sticker";
}

/**
 * Calendared: a note's sticker, read only from the sticker property (e.g. `sticker: 👍`).
 * If the property holds a list (e.g. edited by hand), its first single-emoji item is used.
 * Upstream stored stickers as `#prefix+emoji` tags in the body; those are no longer read.
 */
export function getSticker(cache: CachedMetadata | null | undefined): TSticker | null {
  // Calendared: with stickers turned off in the settings, no note has one as far as the plugin is concerned
  if (!get(settingsStore).stickersEnabled) return null;

  const value: unknown = cache?.frontmatter?.[getStickerProperty()];
  const emoji = Array.isArray(value)
    ? value.map(asEmoji).find((e) => e !== null) ?? null
    : asEmoji(value);
  return emoji ? { emoji } : null;
}

/**
 * Calendared: set a note's sticker by writing the emoji to the sticker property (replacing any previous one).
 * Upstream inserted `#prefix+emoji` at the very top of the body, which broke the properties block.
 */
export async function setSticker(file: TFile, emoji: string) {
  const app = PluginService.getPlugin()?.app;
  if (!app) return;

  const property = getStickerProperty();
  await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
    frontmatter[property] = emoji;
  });
}

/** Calendared: remove a note's sticker by deleting the sticker property */
export async function removeSticker(file: TFile) {
  const app = PluginService.getPlugin()?.app;
  if (!app) return;

  const property = getStickerProperty();
  await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
    delete frontmatter[property];
  });
}
