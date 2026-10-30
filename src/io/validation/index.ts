import { granularities } from '@/constants';
import { PeriodSettings, settingsStore, TFormat } from '@/settings';
import { get } from 'svelte/store';
import { type IGranularity } from '../types';
import { normalizePath } from 'obsidian';
import { formatPeriod, parsePeriod, rangeOfPeriod, type PeriodName } from '@/periods';
import { weekSchemeFor } from '@/weeks';
import { PluginService } from '@/app-service';
import { vaultSource } from '../vault-source';

export function removeEscapedCharacters(format: string): string {
    const withoutBrackets = format.replace(/\[[^\]]*\]/g, ''); // remove everything within brackets

    return withoutBrackets.replace(/\\./g, '');
}

export function getBasename(format: string): string {
    const isTemplateNested = format.indexOf('/') !== -1;
    return isTemplateNested ? format.split('/').pop() ?? '' : format;
}

export function isValidPeriodicNote(fileName: string, customGranularities = granularities as unknown as IGranularity[], customFormats?: Record<string, TFormat>)
    : { isValid: boolean, granularity: IGranularity, date: moment.Moment, period: PeriodName, format: PeriodSettings['formats'][0] } | { isValid: null, granularity: null, date: null, period: null, format: null } {
    // Calendared: every granularity is read as a period name through the week scheme (docs/periods.md).
    // Upstream built a weekly note's date from today, so it fell on today's weekday instead of the week's first day
    const weeks = weekSchemeFor(get(settingsStore).localeSettings);

    for (const granularity of customGranularities) {
        const formats = customFormats || get(settingsStore).periods[granularity].formats;
        for (const format of Object.values(formats)) {
            const period = parsePeriod(fileName, granularity, format.value, weeks);
            // the name must be exactly what this format writes for that period
            if (!period || formatPeriod(period, format.value, weeks) !== fileName) continue;

            const date = rangeOfPeriod(period, weeks)!.start;
            return { isValid: !format.error, granularity, date, period, format };
        }
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
