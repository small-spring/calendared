import { TFile } from 'obsidian';
import { writable } from 'svelte/store';

const timelineParentFileStore = writable<TFile | null>(null);
export { timelineParentFileStore };
