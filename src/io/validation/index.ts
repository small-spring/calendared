import { granularities } from '@/constants';
import { settingsStore } from '@/settings';
import { get } from 'svelte/store';
import { type IGranularity } from '../types';
import { normalizePath } from 'obsidian';
import { formatPeriod, parsePeriod, rangeOfPeriod, type PeriodName } from '@/periods';
import { weekSchemeFor } from '@/weeks';
import { PluginService } from '@/app-service';
import { vaultSource } from '../vault-source';
import { validateFormat } from './format';

export function removeEscapedCharacters(format: string): string {
    const withoutBrackets = format.replace(/\[[^\]]*\]/g, ''); // remove everything within brackets

    return withoutBrackets.replace(/\\./g, '');
}

export function getBasename(format: string): string {
    const isTemplateNested = format.indexOf('/') !== -1;
    return isTemplateNested ? format.split('/').pop() ?? '' : format;
}

export function isValidPeriodicNote(fileName: string, customGranularities = granularities as unknown as IGranularity[])
    : { isValid: boolean, granularity: IGranularity, date: moment.Moment, period: PeriodName, format: string } | { isValid: null, granularity: null, date: null, period: null, format: null } {
    // Calendared: every granularity is read as a period name through the week scheme (docs/spec/periods.md).
    // Upstream built a weekly note's date from today, so it fell on today's weekday instead of the week's first day
    const weeks = weekSchemeFor(get(settingsStore).localeSettings);

    for (const granularity of customGranularities) {
        // Calendared: a period has one format (docs/adr/0019)
        const format = get(settingsStore).periods[granularity].format;
        if (!format.trim()) continue;
        const period = parsePeriod(fileName, granularity, format, weeks);
        // the name must be exactly what this format writes for that period
        if (!period || formatPeriod(period, format, weeks) !== fileName) continue;

        const date = rangeOfPeriod(period, weeks)!.start;
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
export function isTemplateValid(template: string): boolean {
    if (!template) {
        return false;
    }

    return PluginService.getPlugin()?.app.vault.getAbstractFileByPath(template) !== null;
}

export * from "./format"
export * from './constants'
