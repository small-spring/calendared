import type { IGranularity } from "@/io/types";

/** What a tab's breadcrumbs and mini calendar are mounted with (Navigation.svelte's props, less where the tab sits) */
export type NavigationMountProps =
  | { isPeriodic: true; granularity: IGranularity; date: moment.Moment }
  /** a note that isn't a periodic note: it shows where now is, which it works out itself */
  | { isPeriodic: false; granularity: null; date: null };

type NoteInfo = { isPeriodic: boolean; granularity: IGranularity | null; date: moment.Moment | null };

/**
 * Calendared: which breadcrumbs and mini calendar each tab (leaf) shows (docs/adr/0017), apart from Obsidian so it can
 * be tested. Upstream remembered a single "note the timeline belongs to" for the whole app, only for periodic notes,
 * and removed timelines by deleting their elements without unmounting them, so a tab could keep another note's
 * timeline, a note could lose its own, and every removed timeline kept its observers.
 *
 * Each tab keeps its own while it shows the same note, read as the same period, so moving the mini calendar survives switching tabs; a tab
 * showing another note gets a new one, and a closed tab's is unmounted
 */
export class NavigationSync<Leaf extends object, Component, File extends { path: string }> {
  private shown = new Map<Leaf, { path: string; target: unknown; props: NavigationMountProps; component: Component }>();

  constructor(
    private ops: {
      mount: (leaf: Leaf, props: NavigationMountProps) => Component;
      unmount: (component: Component) => void;
      read: (file: File) => NoteInfo;
    },
  ) {}

  /**
   * Bring every tab in line with the note it shows. `tabs` lists the open note tabs; `target` is where a tab's
   * navigation goes (its view's element), so a view rebuilt inside the same tab gets a new one. `show` says whether
   * either feature shows on periodic notes and on other notes (from the settings, on this device)
   */
  sync(tabs: { leaf: Leaf; target: unknown; file: File | null }[], show: { periodic: boolean; other: boolean }) {
    const seen = new Set<Leaf>();
    for (const { leaf, target, file } of tabs) {
      seen.add(leaf);
      const note = file && this.ops.read(file);
      const current = this.shown.get(leaf);

      if (!file || !note || !(note.isPeriodic ? show.periodic : show.other)) {
        this.remove(leaf);
        continue;
      }
      const props: NavigationMountProps =
        note.isPeriodic && note.granularity && note.date
          ? { isPeriodic: true, granularity: note.granularity, date: note.date }
          : { isPeriodic: false, granularity: null, date: null };
      // Calendared: the same note reads differently after the settings change (its format, the week start, the
      // quarters' and years' start month), so what it was read as counts too
      if (current && current.path === file.path && current.target === target && sameProps(current.props, props)) {
        continue;
      }
      this.remove(leaf);
      this.shown.set(leaf, { path: file.path, target, props, component: this.ops.mount(leaf, props) });
    }

    for (const leaf of [...this.shown.keys()]) {
      if (!seen.has(leaf)) this.remove(leaf);
    }
  }

  /** Unmount every tab's navigation (the plugin is unloading) */
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

function sameProps(a: NavigationMountProps, b: NavigationMountProps): boolean {
  if (!a.isPeriodic || !b.isPeriodic) return a.isPeriodic === b.isPeriodic;
  return a.granularity === b.granularity && a.date.valueOf() === b.date.valueOf();
}
