import { granularities } from '@/constants';
import { settingsStore } from '@/settings';
import { get } from 'svelte/store';
import { type IGranularity } from '../types';
import { normalizePath } from 'obsidian';
import { parsePeriod, periodRulesFor, rangeOfPeriod, type PeriodName } from '@/periods';
import { PluginService } from '@/app-service';
import { vaultSource } from '../vault-source';
import { isInFolder } from '../notes-by-format';
import { validateFormat } from './format';
import { templateFilePath } from '../note-path';

/**
 * Calendared: a periodic note is a Markdown file in its period's folder (or a folder under it), named exactly what the
 * period's format writes, the same rule as the settings' counts and the migrations (docs/adr/0044). Upstream read the
 * name alone, so a note named like a date anywhere in the vault had a sticker button, breadcrumbs and so on
 */
export function isValidPeriodicNote(file: { path: string; basename: string; extension: string })
    : { isValid: boolean, granularity: IGranularity, date: moment.Moment, period: PeriodName, format: string } | { isValid: null, granularity: null, date: null, period: null, format: null } {
    const notPeriodic = { isValid: null, granularity: null, date: null, period: null, format: null } as const;
    if (file.extension !== "md") return notPeriodic;
    const fileName = file.basename;
    // Calendared: every granularity is read as a period name through the period rules (docs/spec/periods.md, docs/adr/0039).
    // Upstream built a weekly note's date from today, so it fell on today's weekday instead of the week's first day
    const rules = periodRulesFor(get(settingsStore));

    for (const granularity of granularities) {
        // Calendared: a period has one format (docs/adr/0019)
        const { format, folder } = get(settingsStore).periods[granularity];
        if (!format.trim() || !isInFolder(file.path, folder)) continue;
        // the name must be exactly what this format writes for that period (parsePeriod checks it)
        const period = parsePeriod(fileName, granularity, format, rules);
        if (!period) continue;

        const date = rangeOfPeriod(period, rules)!.start;
        return { isValid: !validateFormat(format, granularity), granularity, date, period, format };
    }

    return notPeriodic;
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

    // Calendared: the same path as creating a note reads
    const normalizedTemplate = templateFilePath(template);
    if (!normalizedTemplate) {
        return "";
    }
    if (!PluginService.getPlugin()?.app.vault.getAbstractFileByPath(normalizedTemplate)) {
        return "Template file not found";
    }

    return "";
}
export * from "./format"
