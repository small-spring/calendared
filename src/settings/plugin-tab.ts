import { PluginService } from "@/app-service";
import { DEFAULT_FORMATS_PER_GRANULARITY } from "@/constants";
import { getPeriodicityFromGranularity, IGranularity } from "@/io";
import Settings from "@/settings/ui/Index.svelte";
import { genNoticeFragment } from "@/ui/utils";
import { capitalize } from "@/utils";
import { App, Notice, PluginSettingTab } from 'obsidian';
import { mount, unmount } from "svelte";
import { get } from "svelte/store";
import { settingsStore } from "./store";
import { validateFormat } from "@/io/validation";

export class SettingsTab extends PluginSettingTab {
  private view: Record<string, unknown> | null = null;

  constructor() {
    const plugin = PluginService.getPlugin();
    const app = plugin?.app as App;
    if (plugin && app) {
      super(app, plugin);
    }
  }

  display() {
    // Calendared: a tab shown again without being hidden first kept its previous component mounted
    if (this.view) void unmount(this.view);
    this.containerEl.empty();

    this.view = mount(Settings, {
      target: this.containerEl
    })
  }
  hide() {
    super.hide()
    // Calendared: unmount once; Obsidian can hide a tab that is already hidden, which made Svelte warn
    // lifecycle_double_unmount
    if (this.view) void unmount(this.view)
    this.view = null

    // Calendared: a period has one format (docs/adr/0019). An empty or invalid one is replaced with the default, so
    // creating a note always has a valid format
    const errors = [];
    for (const g of Object.keys(get(settingsStore).periods) as IGranularity[]) {
      this.replaceFormatIfNeeded(g);
      if (validateFormat(get(settingsStore).periods[g].format, g)) {
        errors.push(capitalize(getPeriodicityFromGranularity(g)))
      }
    }

    if (errors.length > 0) {
      new Notice(genNoticeFragment([
        ['Warning: Invalid settings for these periods: '],
        [errors.join(', '), 'u-pop'],
        ['. Calendar functionality may be affected.']
      ]), 8000);
    }
  }

  private replaceFormatIfNeeded(granularity: IGranularity) {
    const invalidValue = get(settingsStore).periods[granularity].format;
    if (invalidValue.trim() && !validateFormat(invalidValue, granularity)) return;

    const correctedValue = DEFAULT_FORMATS_PER_GRANULARITY[granularity];
    settingsStore.update((s) => {
      s.periods[granularity].format = correctedValue;
      return s
    })
    if (!invalidValue.trim()) return;

    const periodicity = capitalize(getPeriodicityFromGranularity(granularity));
    new Notice(genNoticeFragment([
      [periodicity, 'u-pop'],
      [' format '],
      [invalidValue, 'u-pop'],
      [' is invalid. '],
      ['Using '],
      [correctedValue, 'u-pop'],
      [' to prevent errors.'],
    ]), 8000)
  }
}
