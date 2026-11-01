// Calendared: the header buttons the plugin adds to Markdown views (the sticker button and Open now), one per view,
// through Obsidian's `view.addAction`. Each kind keeps its own buttons and decides when a view has one
import { MarkdownView, type App } from "obsidian";

export class ViewActions {
  private buttons = new Map<MarkdownView, HTMLElement>();

  /** The Markdown views open now. The buttons of views that were closed are removed */
  openViews(app: App): Set<MarkdownView> {
    const views = new Set<MarkdownView>();
    for (const leaf of app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView) views.add(leaf.view);
    }
    for (const [view, button] of this.buttons) {
      if (!views.has(view)) {
        button.remove();
        this.buttons.delete(view);
      }
    }
    return views;
  }

  get(view: MarkdownView): HTMLElement | undefined {
    return this.buttons.get(view);
  }

  /** The view's button, added the first time */
  ensure(view: MarkdownView, icon: string, title: string, onClick: (event: MouseEvent) => void): HTMLElement {
    let button = this.buttons.get(view);
    if (!button) {
      button = view.addAction(icon, title, onClick);
      this.buttons.set(view, button);
    }
    return button;
  }

  remove(view: MarkdownView) {
    this.buttons.get(view)?.remove();
    this.buttons.delete(view);
  }

  removeAll() {
    for (const button of this.buttons.values()) button.remove();
    this.buttons.clear();
  }
}
