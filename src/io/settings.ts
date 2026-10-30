import { DAILY_NOTES_PLUGIN_ID, DEFAULT_FORMATS_PER_GRANULARITY } from '@/constants';
import { getDefaultPeriodicNotesConfig, type ISettings, PeriodSettings, settingsStore } from '@/settings';
import { get } from 'svelte/store';
import { IGranularity } from './types';
import { PluginService } from '@/app-service';

export type DnPluginSettings = {
  enabled: boolean;
  instance?: {
    options?: {
      autorun: boolean;
      format: string;
      folder: string;
      template: string;
    }
  }
}
/**
 * Read user settings from notes tab in `settings/plugin-tab.ts` and `daily-notes` plugin
 * to keep behavior of creating a new note in-sync.
 */
type TNormalizedPeriodSettings = Record<IGranularity, { settings: PeriodSettings, type: "period" | "daily" | "default" }>
export function getNormalizedPeriodSettings(granularity: IGranularity): TNormalizedPeriodSettings[IGranularity] {
  const dailyNotesPlugin = PluginService.getPlugin()?.app.internalPlugins?.getPluginById<DnPluginSettings>(DAILY_NOTES_PLUGIN_ID);
  return normalizePeriodSettings(granularity, get(settingsStore).periods, dailyNotesPlugin);
}

/**
 * Calendared: getNormalizedPeriodSettings with what it reads as arguments: the plugin's period settings and
 * Obsidian's core Daily notes plugin (read through the vault source, docs/adr/0016)
 */
export function normalizePeriodSettings(
  granularity: IGranularity,
  pluginSettings: ISettings["periods"],
  dailyNotesPlugin: DnPluginSettings | null | undefined,
): TNormalizedPeriodSettings[IGranularity] {
  const dailyNotesPluginSettings = dailyNotesPlugin?.instance?.options;

  const settings = pluginSettings[granularity];
  if (settings.enabled) {
    return {
      type: "period",
      settings
    }
  } else if (granularity === 'day' && !pluginSettings.day.enabled && dailyNotesPlugin?.enabled) {
    return {
      type: "daily",
      settings: {
        ...pluginSettings.day,
        enabled: true,
        openAtStartup: dailyNotesPluginSettings?.autorun || false,
        selectedFormat: {
          ...pluginSettings.day.selectedFormat,
          value: dailyNotesPluginSettings?.format || DEFAULT_FORMATS_PER_GRANULARITY.day
        },
        folder: dailyNotesPluginSettings?.folder || '/',
        templatePath: dailyNotesPluginSettings?.template || '',
      }
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
