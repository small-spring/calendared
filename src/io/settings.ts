import { getDefaultPeriodicNotesConfig, type ISettings, PeriodSettings, settingsStore } from '@/settings';
import { get } from 'svelte/store';
import { IGranularity } from './types';

/** Calendared: Obsidian's core Daily notes plugin, read only to tell whether it is on (docs/adr/0027) */
export type DnPluginSettings = {
  enabled: boolean;
}

/**
 * Read user settings from notes tab in `settings/plugin-tab.ts`.
 */
type TNormalizedPeriodSettings = Record<IGranularity, { settings: PeriodSettings, type: "period" | "default" }>
export function getNormalizedPeriodSettings(granularity: IGranularity): TNormalizedPeriodSettings[IGranularity] {
  return normalizePeriodSettings(granularity, get(settingsStore).periods);
}

/** Calendared: getNormalizedPeriodSettings with the plugin's period settings as an argument */
export function normalizePeriodSettings(
  granularity: IGranularity,
  pluginSettings: ISettings["periods"],
): TNormalizedPeriodSettings[IGranularity] {
  const settings = pluginSettings[granularity];
  if (settings.enabled) {
    return {
      type: "period",
      settings
    }
  } else {
    return {
      type: "default",
      settings: {
        ...getDefaultPeriodicNotesConfig(granularity),
      }
    }
  }
}
