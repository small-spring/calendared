import { IGranularity } from '@/io';
import { TFile } from 'obsidian';
import { writable } from 'svelte/store';

type TActiveFile = {
    file: TFile | null;
    date: moment.Moment | null;
    granularity: IGranularity | null;
}
const activeFileStore = writable<TActiveFile | null>({ file: null, date: null, granularity: null });
const timelineParentFileStore = writable<TFile | null>(null);
/**
 * Marks the plugin's own create/rename/delete while it runs, so main.ts doesn't record the note in the settings' list
 * twice. Calendared: views no longer read it; they read notes through the vault source (docs/state.md, ADR-S2).
 * It goes with that list (step 5 there)
 */
const internalFileModStore = writable<"created" | "renamed" | "deleted" | null>(null);

export { activeFileStore, timelineParentFileStore, internalFileModStore };
