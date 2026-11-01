// Calendared: the sticker picker (StickerPicker.svelte) as one box mounted on the body of the window it opens in
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
  /** the document (window) the picker is mounted in: the one of the note it was opened from, which may be a pop-out window */
  readonly doc: Document;
  private readonly win: Window;

  private readonly onWindowClick = (event: MouseEvent) => {
    // a click outside the picker closes it
    if (this.opened && !this.el.contains(event.target as Node | null)) this.close();
  };
  private readonly onWindowKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") this.close({ returnFocus: true });
  };

  constructor(doc: Document) {
    this.doc = doc;
    this.win = doc.defaultView ?? window;
    // Calendared: drop a picker a previous load of the plugin left behind (versions without onunload cleanup),
    // otherwise the lookup by id below finds the stale one instead of ours
    doc.querySelectorAll(`#${STICKER_PICKER_ID}`).forEach((staleEl) => staleEl.remove());

    this.component = mount(StickerPickerComponent, {
      target: doc.body,
      props: { close: () => this.close() },
    });
    this.el = doc.getElementById(STICKER_PICKER_ID) as HTMLElement;
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
    this.modalObserver.observe(this.doc.body, { childList: true });

    this.win.addEventListener("click", this.onWindowClick);
    this.win.addEventListener("auxclick", this.onWindowClick);
    this.win.addEventListener("keydown", this.onWindowKeydown);

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

    this.win.removeEventListener("click", this.onWindowClick);
    this.win.removeEventListener("auxclick", this.onWindowClick);
    this.win.removeEventListener("keydown", this.onWindowKeydown);

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
  // Calendared: open in the window of what it was opened from (a note in a pop-out window), not always the main one.
  // One picker at a time: opening in another window takes it out of the previous one
  if (picker && picker.doc !== anchorEl.ownerDocument) destroyStickerPicker();
  picker ??= new StickerPicker(anchorEl.ownerDocument);
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
