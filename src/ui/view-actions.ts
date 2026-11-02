// Calendared: the header buttons the plugin adds to Markdown views (the sticker button and Open now), one per view,
// through Obsidian's `view.addAction`. Each kind keeps its own buttons and decides when a view has one; they stay in
// one order (ACTION_ORDER) however they were added
import { MarkdownView, type App } from "obsidian";

/**
 * The plugin's buttons left to right. The sticker button comes and goes with the note (only periodic notes have it),
 * so it goes on the left: buttons only shift when one to their right disappears, and Open now (on every note) stays put
 */
const ACTION_ORDER = ["sticker", "open-now"] as const;
export type ActionKind = (typeof ACTION_ORDER)[number];

/**
 * Where a new button of `kind` goes among the plugin's buttons already in the header (`present`, left to right): after
 * the last one that comes before it, else before the first one that comes after it, else where Obsidian put it (null).
 * addAction puts each new button at the left end, so without this the order would follow which was added last
 */
export function actionPlacement(
  kind: ActionKind,
  present: ActionKind[],
): { after: number } | { before: number } | null {
  const rank = ACTION_ORDER.indexOf(kind);
  const ranks = present.map((other) => ACTION_ORDER.indexOf(other));
  const after = ranks.findLastIndex((other) => other < rank);
  if (after >= 0) return { after };
  const before = ranks.findIndex((other) => other > rank);
  return before >= 0 ? { before } : null;
}

export class ViewActions {
  private buttons = new Map<MarkdownView, HTMLElement>();

  constructor(private kind: ActionKind) {}

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
      this.place(button);
      this.buttons.set(view, button);
    }
    return button;
  }

  /** Move a new button to its place in ACTION_ORDER among the plugin's other buttons in the same header */
  private place(button: HTMLElement) {
    button.dataset.calendaredAction = this.kind;
    const others = Array.from(button.parentElement?.children ?? []).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== button && !!el.dataset.calendaredAction,
    );
    const placement = actionPlacement(this.kind, others.map((el) => el.dataset.calendaredAction as ActionKind));
    if (!placement) return;
    if ("after" in placement) others[placement.after].after(button);
    else others[placement.before].before(button);
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
