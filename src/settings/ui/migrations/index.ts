// Calendared: opening the migrations (docs/adr/0023, 0024) and the notice's "Keep as is" (docs/adr/0035). The wording is provisional
import { PluginService } from "@/app-service";
import { getPeriodicityFromGranularity, noteNameOf, type IGranularity } from "@/io";
import { countOf } from "@/utils";
import { stickerFromValue } from "@/stickers";
import { getStickerProperty } from "@/ui/utils/emoji-picker";
import { ButtonComponent, Modal } from "obsidian";
import { get } from "svelte/store";
import { settingsStore } from "../../store";
import { MigrationReviewModal } from "./review-modal";
import {
  forgetFinishedNotices,
  forgetNotice,
  formatRenamePlan,
  moveStickers,
  renameNotes,
  stickerMovePlan,
} from "./run";

export * from "./run";

const notes = (n: number) => countOf(n, "note");
const withoutExtension = (path: string) => path.replace(/\.md$/, "");

function showValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (typeof value === "string") return value;
  return Array.isArray(value) ? value.map(showValue).join(", ") : JSON.stringify(value);
}

/** The first characters of a value, so a long one fits on its row */
function shortValue(value: unknown): string {
  const shown = showValue(value);
  return shown.length > 16 ? `${shown.slice(0, 16)}…` : shown;
}

/** The list of the period's notes named in `fromFormat`, to rename them to the current format */
export function openFormatRename(granularity: IGranularity, fromFormat: string, onDone: () => void = () => {}) {
  const plan = formatRenamePlan(granularity, fromFormat);
  const toFormat = get(settingsStore).periods[granularity].format;
  const periodicity = getPeriodicityFromGranularity(granularity);
  new MigrationReviewModal({
    title: `Rename ${periodicity} notes`,
    description: `Notes named in ${fromFormat} get names in ${toFormat}, the current format. Links to them are updated when "Automatically update internal links" is on (Settings › Files and links).`,
    rows: plan.map((row) => ({ key: row.from, from: withoutExtension(row.from), to: noteNameOf(row.to), conflict: row.conflict })),
    separator: " → ",
    conflictHeading: "Skipped: a note with the new name already exists",
    actionLabel: (n) => `Rename ${notes(n)}`,
    runningLabel: (done, total) => `Renaming… ${done}/${total}`,
    run: (keys, onProgress) => renameNotes(plan.filter((row) => keys.includes(row.from)), onProgress),
    // the conflicts listed apart were never run, but were skipped all the same
    resultMessage: ({ changed, skipped }) => {
      const all = skipped + plan.filter((row) => row.conflict).length;
      return `Renamed ${notes(changed)}.` + (all ? ` Skipped ${all}: a note with the new name already exists.` : "");
    },
    onDone: () => {
      forgetFinishedNotices();
      onDone();
    },
  }).open();
}

/** The list of periodic notes with the `fromProperty` property, to move their stickers to the current property */
export function openStickerMove(fromProperty: string, onDone: () => void = () => {}) {
  const plan = stickerMovePlan(fromProperty);
  const toProperty = getStickerProperty();
  // values that aren't an emoji can still be moved; they just won't show as stickers (docs/features/stickers.md, "読み方")
  const notEmoji = plan.filter((row) => !row.conflict && !stickerFromValue(row.value)).length;
  const moving = plan.filter((row) => !row.conflict).length;
  new MigrationReviewModal({
    title: "Move stickers",
    description: `Periodic notes with the "${fromProperty}" property get its value in "${toProperty}", the current sticker property, and "${fromProperty}" is removed. Other properties keep their values, though how they are written may be tidied.`,
    rows: plan.map((row) => ({
      key: row.path,
      from: withoutExtension(row.path),
      to: shortValue(row.value),
      conflict: row.conflict,
      warning: stickerFromValue(row.value) ? undefined : "not an emoji",
    })),
    warning: notEmoji
      ? (notEmoji === moving
          ? moving === 1 ? "The value isn't an emoji" : `None of the ${moving} values is an emoji`
          : `${notEmoji} of ${moving} values ${notEmoji === 1 ? "isn't" : "aren't"} an emoji`) +
        `, so moved, ${notEmoji === 1 ? "it" : "they"} won't show as ${notEmoji === 1 ? "a sticker" : "stickers"}.`
      : undefined,
    separator: ": ",
    conflictHeading: `Skipped: already has "${toProperty}"`,
    actionLabel: (n) => `Move ${countOf(n, "sticker")}`,
    runningLabel: (done, total) => `Moving… ${done}/${total}`,
    run: (keys, onProgress) => moveStickers(plan.filter((row) => keys.includes(row.path)), fromProperty, onProgress),
    resultMessage: ({ changed, skipped }) => {
      const all = skipped + plan.filter((row) => row.conflict).length;
      return `Moved ${countOf(changed, "sticker")}.` + (all ? ` Skipped ${all}: already has "${toProperty}".` : "");
    },
    onDone: () => {
      forgetFinishedNotices();
      onDone();
    },
  }).open();
}

/** "Keep as is": asks first, then forgets the previous format or property, and the notice goes away for good */
export function confirmKeepAsIs(which: IGranularity | "sticker", count: number) {
  const s = get(settingsStore);
  const previous = which === "sticker" ? s.migrationNotices.stickerProperty : s.migrationNotices.formats[which];
  if (!previous) return;
  const modal = new Modal(PluginService.getPlugin()!.app);
  // one note or several: the words follow the count
  const one = count === 1;
  modal.setTitle(one ? "Keep this note as it is?" : "Keep these notes as they are?");
  const text =
    which === "sticker"
      ? `${notes(count)} ${one ? "keeps its sticker" : "keep their stickers"} in "${previous}", so the calendar won't show ${one ? "it" : "them"}.`
      : `${notes(count)} ${one ? "keeps its name" : "keep their names"} in ${previous}, so the calendar won't show ${one ? "it" : "them"}.`;
  modal.contentEl.createEl("p", { text: `${text} ${one ? "The note isn't" : "The notes aren't"} changed or deleted.` });
  modal.contentEl.createEl("p", {
    cls: "calendared-faint",
    text: `This reminder won't come back. To ${which === "sticker" ? "move" : "rename"} ${one ? "it" : "them"} later, open Migrate notes at the bottom of the settings and enter "${previous}".`,
  });
  const buttons = modal.contentEl.createDiv("modal-button-container");
  new ButtonComponent(buttons).setButtonText("Cancel").onClick(() => modal.close());
  new ButtonComponent(buttons)
    .setButtonText("Don't remind me")
    .setCta()
    .onClick(() => {
      forgetNotice(which);
      modal.close();
    });
  modal.open();
}
