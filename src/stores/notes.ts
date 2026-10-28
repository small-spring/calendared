import { IGranularity } from '@/io';
import { settingsStore } from '@/settings';
import { TFile } from 'obsidian';
import { readable, writable } from 'svelte/store';

type TActiveFile = {
    file: TFile | null;
    date: moment.Moment | null;
    granularity: IGranularity | null;
}
const activeFileStore = writable<TActiveFile | null>({ file: null, date: null, granularity: null });
const timelineParentFileStore = writable<TFile | null>(null);
const internalFileModStore = writable<"created" | "renamed" | { modified: number } | "deleted" | null>(null);

/**
 * Calendared: emits whenever something a note lookup (`getFileData`, metadata cache reads) depends on may have changed:
 * settings (folders, formats, the known-notes index) or a note being created, renamed, deleted or having its metadata updated.
 * Read it inside `$derived` to recompute note data, instead of reading `$settingsStore` / `$internalFileModStore` directly.
 *
 * `settingsStore` is only touched once someone subscribes: the bundle defines this module before the settings
 * module (import cycle), so referencing it at load time (e.g. `derived([settingsStore, ...])`) crashes the plugin.
 */
const notesChangedStore = readable({}, (set) => {
    const unsubscribers = [
        settingsStore.subscribe(() => set({})),
        internalFileModStore.subscribe(() => set({})),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
});

export { activeFileStore, timelineParentFileStore, internalFileModStore, notesChangedStore };
