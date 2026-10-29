import { writable } from 'svelte/store';

export * from './dates';
export * from './locale';
export * from './notes';
export * from './popovers';

export const themeStore = writable<"light" | "dark" | null>(null);
