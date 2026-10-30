import {
  ItemView,
  WorkspaceLeaf
} from 'obsidian';

import { View } from '@/ui';
import { mount, unmount } from "svelte";
import { CALENDAR_LUCIDE_ICON, LEAF_TYPE } from './constants';

export class CalendarView extends ItemView {
  private view: Record<string, unknown> | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return LEAF_TYPE;
  }

  getDisplayText() {
    return 'Calendar';
  }

  async onOpen() {
    this.view = mount(View, {
      target: this.contentEl
    });
  }

  onClose(): Promise<void> {
    // Calendared: unmount once; a second call (e.g. onClose run again) made Svelte warn lifecycle_double_unmount
    if (this.view) void unmount(this.view);
    this.view = null;

    return Promise.resolve();
  }

  // TODO: might use user defined icon, like day planner plugin does
  getIcon() {
    return CALENDAR_LUCIDE_ICON;
  }
}
