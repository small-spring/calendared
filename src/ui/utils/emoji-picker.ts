import { STICKER_PICKER_ID } from "@/constants";
import { TFileData } from "@/io";
import { settingsStore } from "@/settings";
import { getEmojiPickerLocale } from "./emoji-locale";
import { Picker } from "emoji-mart";
import { stickerFrom, stickerProperty, type TSticker } from "@/stickers";
import { type CachedMetadata, type TFile } from "obsidian";
import { get } from "svelte/store";
import { PluginService } from "@/app-service";
import { stickerPickerNoteStore } from "@/stores/sticker-picker";
import { closeStickerPicker } from "../sticker-picker";

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
// Calendared: reading stickers moved to src/stickers.ts (settings as arguments); re-exported for the existing importers
export { isReservedStickerProperty, RESERVED_STICKER_PROPERTIES, type TSticker } from "@/stickers";

export const onInputKeydown = (ev: KeyboardEvent) => {
  const input = ev.currentTarget as HTMLInputElement;
  if (ev.key === 'Escape') {
    input.blur();
    closeStickerPicker({ returnFocus: true });
  }

  // Calendared: ↑ in the search box moves to the remove button above it, but only while no emoji is selected.
  // With one selected, ↑ stays emoji-mart's (one row up, or back to the search box from the top row).
  // This listener runs before emoji-mart's, which is on the same input without capture
  if (ev.key === 'ArrowUp') {
    const root = input.getRootNode();
    const emojiSelected = root instanceof ShadowRoot && root.querySelector('.category button[aria-selected]');
    // Calendared: the picker's own document, which is a pop-out window's when opened from one
    const removeButton = input.ownerDocument.getElementById(STICKER_PICKER_ID)?.querySelector<HTMLElement>('.pnc-sticker-remove');
    if (!emojiSelected && removeButton) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      removeButton.focus();
    }
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
      closeStickerPicker();

      // Calendared: read the target note now rather than from `fileData` captured when the picker was built,
      // so the sticker always goes to the note the picker was opened for
      const file = get(stickerPickerNoteStore)?.file ?? fileData.file;
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
  // Calendared: the picker sits inside the sticker picker's box (StickerPicker.svelte), which draws the border,
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

/** Calendared: the property stickers live in, from the current settings (see stickerProperty) */
export function getStickerProperty(): string {
  return stickerProperty(get(settingsStore).stickerProperty);
}

/** Calendared: a note's sticker under the current settings (see stickerFrom) */
export function getSticker(cache: CachedMetadata | null | undefined): TSticker | null {
  return stickerFrom(cache, get(settingsStore));
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
