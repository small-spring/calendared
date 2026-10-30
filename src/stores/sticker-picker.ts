import type { TFileData } from "@/io";

import { writable } from "svelte/store";

/** Calendared: the note the sticker picker is open for, and its sticker (src/ui/sticker-picker.ts) */
export const stickerPickerNoteStore = writable<TFileData | null>(null)
