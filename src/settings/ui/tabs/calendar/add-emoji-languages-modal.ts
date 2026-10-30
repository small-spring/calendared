import { PluginService } from "@/app-service";
import { App, Modal } from "obsidian";
import { mount, unmount } from "svelte";
import AddEmojiLanguages from "./AddEmojiLanguages.svelte";

/** Calendared: the "Add languages" dialog for emoji search (AddEmojiLanguages.svelte) */
export class AddEmojiLanguagesModal extends Modal {
  private component: Record<string, unknown> | null = null;

  constructor() {
    super(PluginService.getPlugin()?.app as App);
  }

  onOpen() {
    this.titleEl.setText("Add emoji search languages");
    this.component = mount(AddEmojiLanguages, { target: this.contentEl, props: { close: () => this.close() } });
  }

  onClose() {
    if (this.component) void unmount(this.component);
    this.component = null;
    this.contentEl.empty();
  }
}
