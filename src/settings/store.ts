import { derived, writable } from "svelte/store";
import { periodRulesFor } from "@/periods";
import { DEFAULT_SETTINGS, type ISettings } from "./constants";

function createEnhancedStore(initialValue: ISettings) {
  const { update, set, subscribe } = writable<ISettings>(initialValue);

  return {
    update,
    set,
    subscribe,
  };
}

export const settingsStore = createEnhancedStore(DEFAULT_SETTINGS);

/**
 * Calendared: the period rules the settings set (the week start, the quarters' and years' cycles), made once per change
 * of the settings. The views read it instead of each calendar cell making its own
 */
export const periodRulesStore = derived(settingsStore, (settings) => periodRulesFor(settings));
