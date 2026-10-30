import { granularities } from "@/constants";
import { settingsStore } from "@/settings";
import { get } from "svelte/store";

export function getStartupNoteGranularity() {
  for (const granularity of granularities) {
    const settings = get(settingsStore).periods[granularity]
    if (settings.enabled && settings.openAtStartup) {
      return granularity
    }
  }
}

export function trim(s: string) {
  return s
    .trim()
    .split(" ")
    .filter((s) => s.trim())
    .join(" ");
}

