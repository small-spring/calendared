// Calendared: a period's template setting follows its file when the file (or a folder above it) is renamed or moved,
// like Obsidian's own links (docs/adr/0049)
import { granularities } from "@/constants";
import type { IGranularity } from "@/io";

type TemplatePaths<T> = Record<IGranularity, T & { templatePath: string }>;

/** The periods with their template paths moved from `oldPath` to `newPath`; null when no template is there */
export function followTemplateRename<T>(periods: TemplatePaths<T>, oldPath: string, newPath: string): TemplatePaths<T> | null {
    const moved = (path: string) => {
        if (path === oldPath) return newPath;
        if (path.startsWith(`${oldPath}/`)) return newPath + path.slice(oldPath.length);
        return null;
    };
    if (!granularities.some((g) => moved(periods[g].templatePath) !== null)) return null;
    return Object.fromEntries(
        granularities.map((g) => [g, { ...periods[g], templatePath: moved(periods[g].templatePath) ?? periods[g].templatePath }]),
    ) as TemplatePaths<T>;
}
