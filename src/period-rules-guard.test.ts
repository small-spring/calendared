import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Calendared: quarters and years are cut by the period rules in periods.ts only (docs/adr/0039). moment's quarter and
// year are the calendar's, so asking it directly elsewhere would ignore a start month other than January.
// ESLint doesn't read the .svelte files, so this test looks through every source file instead.
// A line that means the calendar's year on purpose (not a quarterly or yearly note) says so with "calendar on purpose",
// on the line or in a comment just above it.
// Moving a date by whole quarters or years (`.add(1, "year")`) is allowed: it moves every 3- or 12-month cycle by
// exactly one period, whatever month the cycle starts in

const ALLOWED_FILES = ["src/periods.ts"];
const FORBIDDEN: { pattern: RegExp; use: string }[] = [
    { pattern: /\.quarter\(/, use: "periodOf(\"quarter\", …)" },
    // Calendared: the calendar year, read or set (2026-11-01)
    { pattern: /\.years?\(/, use: "periodOf(\"year\", …) / rangeOfPeriod" },
    { pattern: /(startOf|endOf)\(\s*["'](quarter|year)["']/, use: "periodStart / rangeOfPeriod" },
    { pattern: /(startOf|endOf)\(\s*granularity\s*\)/, use: "periodStart / rangeOfPeriod" },
    { pattern: /isSame\([^)]*["'](quarter|year)["']\s*\)/, use: "samePeriod" },
    { pattern: /isSame\([^)]*,\s*granularity\s*\)/, use: "samePeriod" },
];

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return sourceFiles(path);
        return /\.(ts|svelte)$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
    });
}

describe("四半期と年の区切りは periods.ts だけが知っている", () => {
    it("ほかのファイルは、moment に暦の四半期・年を直接聞かない", () => {
        const found: string[] = [];
        for (const file of sourceFiles("src")) {
            if (ALLOWED_FILES.includes(file)) continue;
            const lines = readFileSync(file, "utf8").split("\n");
            lines.forEach((line, i) => {
                if (line.includes("calendar on purpose") || lines[i - 1]?.includes("calendar on purpose")) return;
                for (const { pattern, use } of FORBIDDEN) {
                    if (pattern.test(line)) found.push(`${file}:${i + 1} (use ${use}): ${line.trim()}`);
                }
            });
        }
        expect(found).toEqual([]);
    });
});
