import { writable } from 'svelte/store';

export * from './dates';
export * from './locale';
export * from './sticker-picker';

export const themeStore = writable<"light" | "dark" | null>(null);
