import { writable } from "svelte/store";
import { DEFAULT_SETTINGS, type ISettings } from "./constants";

function createEnhancedStore(initialValue: ISettings) {
  const { update, set, subscribe } = writable<ISettings>(initialValue);

  return {
    update,
    set,
    subscribe,

    // Bulk operations
    reset() {
      set(DEFAULT_SETTINGS);
    },
  };
}

export const settingsStore = createEnhancedStore(DEFAULT_SETTINGS);
