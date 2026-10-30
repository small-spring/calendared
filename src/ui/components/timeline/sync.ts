import type { IGranularity } from "@/io/types";
import type { TimelineViewMode } from "@/settings";

/** What a timeline is mounted with (Timeline.svelte's props, less what depends on where the tab sits) */
export type TimelineMountProps = {
  granularity: IGranularity;
  initialDate: moment.Moment;
  isPeriodic: boolean;
  viewModeOverride: TimelineViewMode;
  /** The user opened or closed the timeline; the tab starts its next timeline that way */
  onViewModeChange: (viewMode: TimelineViewMode) => void;
};

type NoteInfo = { isPeriodic: boolean; granularity: IGranularity | null; date: moment.Moment | null };
type Kind = "periodic" | "rest";

/**
 * Calendared: which timeline each tab (leaf) shows (docs/state.md, ADR-S3), apart from Obsidian so it can be tested.
 * Upstream remembered a single "note the timeline belongs to" for the whole app, only for periodic notes, and removed
 * timelines by deleting their elements without unmounting them, so a tab could keep another note's timeline, a note
 * could lose its own, and every removed timeline kept its observers (docs/todo.md, bug (4)).
 *
 * Each tab keeps its timeline while it shows the same note, so moving through weeks or closing it survives switching
 * tabs; a tab showing another note gets a new one, and a closed tab's is unmounted. Whether a timeline starts open
 * comes from the settings, or from how the user last left the tab's timeline, not from the pane's width.
 */
export class TimelineSync<Leaf extends object, Component, File extends { path: string }> {
  private shown = new Map<Leaf, { path: string; target: unknown; component: Component }>();
  private viewModes = new WeakMap<Leaf, Partial<Record<Kind, TimelineViewMode>>>();

  constructor(
    private ops: {
      mount: (leaf: Leaf, props: TimelineMountProps) => Component;
      unmount: (component: Component) => void;
      read: (file: File) => NoteInfo;
    },
  ) {}

  /**
   * Bring every tab's timeline in line with the note it shows. `tabs` lists the open note tabs; `target` is where a
   * tab's timeline goes (its view's element), so a view rebuilt inside the same tab gets a new one
   */
  sync(
    tabs: { leaf: Leaf; target: unknown; file: File | null }[],
    settings: { displayOnRestNotes: boolean; viewMode: TimelineViewMode; restViewMode: TimelineViewMode },
  ) {
    const seen = new Set<Leaf>();
    for (const { leaf, target, file } of tabs) {
      seen.add(leaf);
      const note = file && this.ops.read(file);
      const current = this.shown.get(leaf);

      if (!file || !note || !(note.isPeriodic || settings.displayOnRestNotes)) {
        this.remove(leaf);
        continue;
      }
      if (current && current.path === file.path && current.target === target) continue;
      this.remove(leaf);

      const kind: Kind = note.isPeriodic ? "periodic" : "rest";
      const component = this.ops.mount(leaf, {
        granularity: note.granularity ?? "day",
        initialDate: note.date ?? window.moment(),
        isPeriodic: note.isPeriodic,
        viewModeOverride:
          this.viewModes.get(leaf)?.[kind] ?? (note.isPeriodic ? settings.viewMode : settings.restViewMode),
        onViewModeChange: (viewMode) => this.viewModes.set(leaf, { ...this.viewModes.get(leaf), [kind]: viewMode }),
      });
      this.shown.set(leaf, { path: file.path, target, component });
    }

    for (const leaf of [...this.shown.keys()]) {
      if (!seen.has(leaf)) this.remove(leaf);
    }
  }

  /** Unmount every timeline (the timeline was turned off, or its settings changed and `sync` mounts them again) */
  clear() {
    for (const leaf of [...this.shown.keys()]) this.remove(leaf);
  }

  private remove(leaf: Leaf) {
    const current = this.shown.get(leaf);
    if (!current) return;
    this.shown.delete(leaf);
    this.ops.unmount(current.component);
  }
}
