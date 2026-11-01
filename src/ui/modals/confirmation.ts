import { Modal } from 'obsidian';
import { Component, mount, unmount } from 'svelte';
import { ModalManager } from './modals-manager';
import { ConfirmationModal as ConfirmationModalComponent } from '../components';
import { PluginService } from '@/app-service';

type TextContent = string | {
  Component: Component;
  props?: Record<string, unknown>;
};

export interface IConfirmationDialogParams {
  title: TextContent;
  text: TextContent;
  note?: string | TextContent | null;
  cta: string;
  onAccept: (dontAskAgain: boolean) => Promise<void> | void;
}

export class ConfirmationModal extends Modal {
  private component: Record<string, unknown> | null = null;

  constructor(config: IConfirmationDialogParams) {
    const app = PluginService.getPlugin()?.app
    if (!app) return;

    super(app);
    ModalManager.register(this);

    const { contentEl } = this;

    // Create a div to mount the Svelte component
    const svelteContainer = contentEl.createDiv();

    // Instantiate the Svelte component
    this.component = mount(ConfirmationModalComponent, {
      target: svelteContainer,
      props: {
        config,
        modalClass: this
      }
    });
  }

  // Calendared: take the Svelte component down with the modal (upstream left it mounted)
  onClose() {
    if (this.component) void unmount(this.component);
    this.component = null;
  }
}

export function createConfirmationDialog(params: IConfirmationDialogParams) {
  new ConfirmationModal(params).open();
}
