import { FileMenuPopoverBehavior, type FileMenuOpenParams } from "./file-menu";
import { StickerPopoverBehavior, type TStickerPopoverParams } from "./sticker";

export class Popover<T extends StickerPopoverBehavior | FileMenuPopoverBehavior> {
  static stickerSingleton: Popover<StickerPopoverBehavior> | null = null;
  static fileMenuSingleton: Popover<FileMenuPopoverBehavior> | null = null;
  open: (param: FileMenuOpenParams | Element) => void;
  close: () => void;
  toggle: (param: FileMenuOpenParams | Element) => void;
  cleanup: () => void;

  static mutationObserverStarted = false;

  constructor(public behaviors: T) {
    this.open = behaviors.open.bind(behaviors);
    this.close = behaviors.close.bind(behaviors);
    this.toggle = behaviors.toggle.bind(behaviors);
    this.cleanup = behaviors.cleanup.bind(behaviors);
  }

  static cleanup() {
    Popover.stickerSingleton = null;
    Popover.fileMenuSingleton = null;

    Popover.mutationObserverStarted = false;
  }

  static closeAll() {
    Popover.stickerSingleton?.close();
    Popover.fileMenuSingleton?.close();
  }
}

export const createStickerPopover = (params: TStickerPopoverParams) => {
  if (!Popover.stickerSingleton) {
    Popover.stickerSingleton = new Popover(new StickerPopoverBehavior(params))
  }
  return Popover.stickerSingleton
}
export const createFileMenuPopover = () => {
  if (!Popover.fileMenuSingleton) {
    Popover.fileMenuSingleton = new Popover(new FileMenuPopoverBehavior())
  }
  return Popover.fileMenuSingleton
}
