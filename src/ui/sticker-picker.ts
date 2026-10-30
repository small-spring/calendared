// Calendared: the sticker picker (StickerPicker.svelte) as one box mounted on document.body. Upstream split it into
// a generic popover behavior shared with the floating calendar and a sticker subclass; only the picker is left
import { MODAL_CLASS, STICKER_PICKER_ID } from "@/constants";
import { stickerPickerNoteStore } from "@/stores/sticker-picker";
import StickerPickerComponent from "@/ui/components/StickerPicker.svelte";
import { autoUpdate, computePosition, flip } from "@floating-ui/dom";
import { Platform, type TFile } from "obsidian";
import { mount, unmount } from "svelte";
import { PluginService } from "@/app-service";
import { settingsStore } from "@/settings";
import { stickerFrom } from "@/stickers";
import { get } from "svelte/store";

class StickerPicker {
  private component: Record<string, unknown> | null;
  private el: HTMLElement;
  private anchorEl: Element | null = null;
  private stopFollowingAnchor: (() => void) | null = null;
  private modalObserver: MutationObserver | null = null;
  private opened = false;

  private readonly onWindowClick = (event: MouseEvent) => {
    // a click outside the picker closes it
    if (this.opened && !this.el.contains(event.target as Node | null)) this.close();
  };
  private readonly onWindowKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") this.close({ returnFocus: true });
  };

  constructor() {
    // Calendared: drop a picker a previous load of the plugin left behind (versions without onunload cleanup),
    // otherwise the lookup by id below finds the stale one instead of ours
    document.querySelectorAll(`#${STICKER_PICKER_ID}`).forEach((staleEl) => staleEl.remove());

    this.component = mount(StickerPickerComponent, {
      target: document.body,
      props: { close: () => this.close() },
    });
    this.el = document.getElementById(STICKER_PICKER_ID) as HTMLElement;
  }

  open(anchorEl: Element) {
    this.opened = true;
    this.anchorEl = anchorEl;

    this.el.addClass("visible");
    this.el.removeAttribute("inert");

    // on phones the picker sits at the top of the screen (StickerPicker.svelte) instead of next to the anchor
    if (!Platform.isPhone) {
      this.stopFollowingAnchor = autoUpdate(anchorEl, this.el, () => {
        if (anchorEl.isConnected) this.position(anchorEl);
        else this.stopFollowingAnchor?.();
      });
    }

    // a modal opening on top (e.g. a confirmation) closes the picker
    this.modalObserver = new MutationObserver((records) => {
      const modalAdded = records.some((record) =>
        [...record.addedNodes].some((node) => node instanceof HTMLElement && node.className.contains(MODAL_CLASS)),
      );
      if (modalAdded) this.close();
    });
    this.modalObserver.observe(document.body, { childList: true });

    window.addEventListener("click", this.onWindowClick);
    window.addEventListener("auxclick", this.onWindowClick);
    window.addEventListener("keydown", this.onWindowKeydown);

    this.searchInput()?.focus();
  }

  /** `returnFocus`: put the focus back on what opened the picker (closing with Esc) */
  close({ returnFocus = false } = {}) {
    this.opened = false;

    this.el.removeClass("visible");
    this.el.setAttribute("inert", "");

    this.stopFollowingAnchor?.();
    this.stopFollowingAnchor = null;
    this.modalObserver?.disconnect();
    this.modalObserver = null;

    window.removeEventListener("click", this.onWindowClick);
    window.removeEventListener("auxclick", this.onWindowClick);
    window.removeEventListener("keydown", this.onWindowKeydown);

    this.searchInput()?.blur();
    if (returnFocus && this.anchorEl instanceof HTMLElement) this.anchorEl.focus();
  }

  destroy() {
    this.close();
    // Calendared: unmount once (a second cleanup made Svelte warn lifecycle_double_unmount)
    if (this.component) void unmount(this.component);
    this.component = null;
  }

  private position(anchorEl: Element) {
    computePosition(anchorEl, this.el, { placement: "right-start", middleware: [flip()] })
      .then(({ x, y }) => {
        Object.assign(this.el.style, { left: `${x}px`, top: `${y}px` });
      })
      .catch(console.error);
  }

  private searchInput() {
    return this.el.querySelector("em-emoji-picker")?.shadowRoot?.querySelector("input");
  }
}

let picker: StickerPicker | null = null;

/** Open the emoji picker for `file`, anchored to `anchorEl` */
export function openStickerPicker(file: TFile, anchorEl: Element) {
  const cache = PluginService.getPlugin()?.app.metadataCache.getFileCache(file);
  stickerPickerNoteStore.set({ file, sticker: stickerFrom(cache, get(settingsStore)) });
  picker ??= new StickerPicker();
  picker.open(anchorEl);
}

export function closeStickerPicker(options?: { returnFocus?: boolean }) {
  picker?.close(options);
}

/** Take the picker out of the page (when the plugin is turned off) */
export function destroyStickerPicker() {
  picker?.destroy();
  picker = null;
}
