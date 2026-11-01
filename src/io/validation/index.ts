import { granularities } from '@/constants';
import { settingsStore } from '@/settings';
import { get } from 'svelte/store';
import { type IGranularity } from '../types';
import { normalizePath } from 'obsidian';
import { formatPeriod, parsePeriod, periodRulesFor, rangeOfPeriod, type PeriodName } from '@/periods';
import { PluginService } from '@/app-service';
import { vaultSource } from '../vault-source';
import { validateFormat } from './format';

export function isValidPeriodicNote(fileName: string, customGranularities = granularities as unknown as IGranularity[])
    : { isValid: boolean, granularity: IGranularity, date: moment.Moment, period: PeriodName, format: string } | { isValid: null, granularity: null, date: null, period: null, format: null } {
    // Calendared: every granularity is read as a period name through the period rules (docs/spec/periods.md, docs/adr/0039).
    // Upstream built a weekly note's date from today, so it fell on today's weekday instead of the week's first day
    const rules = periodRulesFor(get(settingsStore));

    for (const granularity of customGranularities) {
        // Calendared: a period has one format (docs/adr/0019)
        const format = get(settingsStore).periods[granularity].format;
        if (!format.trim()) continue;
        const period = parsePeriod(fileName, granularity, format, rules);
        // the name must be exactly what this format writes for that period
        if (!period || formatPeriod(period, format, rules) !== fileName) continue;

        const date = rangeOfPeriod(period, rules)!.start;
        return { isValid: !validateFormat(format, granularity), granularity, date, period, format };
    }

    return { isValid: null, granularity: null, date: null, period: null, format: null };
}

export function validateFolder(folder: string): string {
    if (!folder || folder === "/") {
        return "";
    }

    // Calendared: read through the vault source, so the settings show the error as soon as the folder is renamed or
    // deleted (upstream checked only while the field was edited, and accepted a file's path)
    if (!vaultSource().folderAt(normalizePath(folder))) {
        return "Folder not found in vault";
    }

    return "";
}
export function validateTemplate(template: string): string {
    if (!template) {
        return "";
    }

    const normalizedTemplate = normalizePath(
        !template.trim().endsWith(".md") ? `${template}.md` : template
    )
    if (!PluginService.getPlugin()?.app.vault.getAbstractFileByPath(normalizedTemplate)) {
        return "Template file not found";
    }

    return "";
}
export * from "./format"
