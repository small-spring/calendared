// Calendared: the list a migration shows before it runs (docs/adr/0024): what changes for each note, a checkbox to leave a
// note out, the notes that will be skipped, and a button that says what it does. The wording and look are provisional
import { PluginService } from "@/app-service";
import { ButtonComponent, Modal, Notice } from "obsidian";
import type { MigrationResult } from "./run";

/** `warning`: said at the start of the row, in the warning color (the row can still be chosen) */
export type ReviewRow = { key: string; from: string; to: string; conflict: boolean; warning?: string };

export type ReviewParams = {
  title: string;
  description: string;
  rows: ReviewRow[];
  conflictHeading: string;
  /** Between a row's `from` and `to` */
  separator: string;
  /** Said above the list, in the warning color */
  warning?: string;
  /** The button's label for `count` notes, and while running */
  actionLabel: (count: number) => string;
  runningLabel: (done: number, total: number) => string;
  run: (keys: string[], onProgress: (done: number) => void) => Promise<MigrationResult>;
  resultMessage: (result: MigrationResult) => string;
  onDone: () => void;
};

export class MigrationReviewModal extends Modal {
  private running = false;

  constructor(private params: ReviewParams) {
    super(PluginService.getPlugin()!.app);
  }

  onOpen() {
    const { params, contentEl } = this;
    this.setTitle(params.title);
    this.modalEl.addClass("calendared-migration-modal");
    contentEl.createEl("p", { text: params.description });
    contentEl.createEl("p", {
      cls: "calendared-migration-backup",
      text: "Before a large change, make sure you have a backup of your vault (Obsidian Sync's version history, Git, or your computer's backup).",
    });

    const selected = new Set(params.rows.filter((row) => !row.conflict).map((row) => row.key));
    const changing = params.rows.filter((row) => !row.conflict);
    const conflicts = params.rows.filter((row) => row.conflict);
    const checkboxes: HTMLInputElement[] = [];

    if (params.warning) contentEl.createEl("p", { cls: "calendared-migration-warning", text: params.warning });
    if (changing.length > 0) {
      const list = contentEl.createDiv("calendared-migration-list");
      for (const row of changing) {
        const label = list.createEl("label", { cls: "calendared-migration-row" });
        const checkbox = label.createEl("input", { type: "checkbox" });
        checkbox.checked = true;
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) selected.add(row.key);
          else selected.delete(row.key);
          updateButton();
        });
        checkboxes.push(checkbox);
        // first, so it lines up and isn't pushed away by a long value
        if (row.warning) label.createSpan({ cls: "calendared-migration-warning", text: row.warning });
        label.createSpan({ text: row.from });
        label.createSpan({ cls: "calendared-faint", text: params.separator });
        label.createSpan({ text: row.to });
      }
    }

    if (conflicts.length > 0) {
      contentEl.createEl("p", { cls: "calendared-migration-conflict-heading", text: `${params.conflictHeading} (${conflicts.length})` });
      const list = contentEl.createDiv("calendared-migration-list");
      for (const row of conflicts) {
        const item = list.createDiv({ cls: "calendared-migration-row calendared-faint" });
        item.createSpan({ text: row.from });
        item.createSpan({ text: params.separator });
        item.createSpan({ text: row.to });
      }
    }

    const buttons = contentEl.createDiv("modal-button-container");
    const cancel = new ButtonComponent(buttons).setButtonText("Cancel").onClick(() => this.close());
    const action = new ButtonComponent(buttons).setCta();
    const updateButton = () => action.setButtonText(params.actionLabel(selected.size)).setDisabled(selected.size === 0);
    updateButton();

    const runSelected = async () => {
      const keys = params.rows.filter((row) => selected.has(row.key)).map((row) => row.key);
      if (this.running || keys.length === 0) return;
      // nothing can be pressed while it runs, and the list can't be closed
      this.running = true;
      action.setDisabled(true).setButtonText(params.runningLabel(0, keys.length));
      cancel.setDisabled(true);
      checkboxes.forEach((checkbox) => (checkbox.disabled = true));
      try {
        const result = await params.run(keys, (done) => {
          action.setButtonText(params.runningLabel(done, keys.length));
        });
        new Notice(params.resultMessage(result), 8000);
      } finally {
        this.running = false;
        this.close();
        params.onDone();
      }
    };
    action.onClick(() => void runSelected());
  }

  close() {
    if (this.running) return;
    super.close();
  }

  onClose() {
    this.contentEl.empty();
  }
}
