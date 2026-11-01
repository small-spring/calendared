import { PluginService } from '@/app-service';
import { FuzzyMatch, FuzzySuggestModal, Notice, TAbstractFile, TFile } from 'obsidian';
import { genNoticeFragment } from '../utils';
import { ModalManager } from './modals-manager';

/** Calendared: the notes a period's format reads, to search and open (docs/adr/0022). */
export class FilepathModal extends FuzzySuggestModal<string> {
  private filePaths: string[];

  constructor(filePaths: string[]) {
    const app = PluginService.getPlugin()?.app
    if (!app) return;

    super(app);
    ModalManager.register(this);

    this.filePaths = filePaths;

    // Set modal properties
    this.setPlaceholder("Type to search files...");
    this.setInstructions([
      { command: "↑↓", purpose: "to navigate" },
      { command: "↵", purpose: "to use" },
      { command: "esc", purpose: "to dismiss" },
    ]);
  }

  getItems(): string[] {
    return this.filePaths;
  }

  getItemText(filePath: string): string {
    // Return the full path for fuzzy searching
    return filePath;
  }

  renderSuggestion(result: FuzzyMatch<string>, el: HTMLElement) {
    // Calendared: plain DOM rather than a Svelte component per row, which was never unmounted
    const filepath = result.item;
    const row = el.createDiv({ cls: "px-0 flex items-baseline" });
    row.createSpan({ cls: "font-medium", text: filepath.split("/").pop() || "" });
    const folder = filepath.substring(0, filepath.lastIndexOf("/"));
    if (folder) row.createSpan({ cls: "opacity-70 [font-size:var(--font-ui-smaller)] h-4 ml-2", text: `in ${folder}` });
  }

  onChooseItem(filePath: string) {
    // Close all modals
    ModalManager.closeAll();

    // close settings tab
    const app = PluginService.getPlugin()?.app
    if (app?.setting && app?.setting?.activeTab) {
      app.setting.close?.();
    }

    const file = this.app.vault.getAbstractFileByPath(filePath);
    const isFileValid = this.isFileValid(filePath, file)

    if (isFileValid && file instanceof TFile) {
      // Open the file in the current leaf (tab)
      this.app.workspace.getLeaf().openFile(file).catch(console.error);

      // Get the file explorer view
      const fileExplorer = this.app.workspace.getLeavesOfType('file-explorer')[0]?.view;
      if (fileExplorer && 'revealInFolder' in fileExplorer) {
        // Reveal and focus the file in the explorer
        fileExplorer.revealInFolder(file);
      }
    }
  }

  private isFileValid(filepath: string, file: TAbstractFile | null) {
    if (!file) {
      new Notice(genNoticeFragment([
        ['Error: File '],
        [filepath, 'u-pop'],
        [' not found'],
      ]))
      return false;
    }

    if (!(file instanceof TFile)) {
      console.warn(`Not a file: ${filepath}`);
      return false
    }

    return true;
  }
}
