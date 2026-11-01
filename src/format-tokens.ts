import type { IGranularity } from "./io/types";

// Calendared: a name format split into moment's tokens and plain text (docs/adr/0041), and which tokens each period's
// format may use (docs/adr/0040). Written with moment's syntax, so formats from other plugins keep working

export type FormatPart = { kind: "token"; token: string } | { kind: "text"; text: string };

/** moment's format tokens, longest first where one is the start of another (as in moment's own tokenizer) */
const TOKEN_RE =
    /\[([^\]]*)\]|\\(.)|(LTS|LT|LL?L?L?|l{1,4}|[Hh]mm(?:ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[ow]?|W[oW]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(?:ggg?)?|GG(?:GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|Y)|([\s\S])/g;

/** The format's tokens and text, in order. Text in [brackets] and a character after \ are text */
export function tokenize(format: string): FormatPart[] {
    const parts: FormatPart[] = [];
    for (const m of format.matchAll(TOKEN_RE)) {
        if (m[1] !== undefined) parts.push({ kind: "text", text: m[1] });
        else if (m[2] !== undefined) parts.push({ kind: "text", text: m[2] });
        else if (m[3] !== undefined) parts.push({ kind: "token", token: m[3] });
        else parts.push({ kind: "text", text: m[4] });
    }
    return parts;
}

type TokenKind = "year" | "weekYear" | "quarter" | "month" | "week" | "day" | "time" | "unusable";

function kindOf(token: string): TokenKind {
    if (/^(YYYY|YY|Y)$/.test(token)) return "year";
    // Calendared: other ways to write the year (y, yyyy, yo, YYYYY) are written as the calendar year even when quarters
    // and years start in another month, so no period may use them (docs/adr/0040)
    if (/^(Y+|y+|yo)$/.test(token)) return "unusable";
    if (/^(g+|G+)$/.test(token)) return "weekYear";
    if (/^Qo?$/.test(token)) return "quarter";
    if (/^M+$|^Mo$/.test(token)) return "month";
    if (/^[wW][oWw]?$/.test(token)) return "week";
    if (/^(D+|DDDo|Do|d+|do|e|E)$/.test(token)) return "day";
    // dates without a time (L, LL, l, ll) name a day; LLL and the rest include a time
    if (/^(LL?|ll?)$/.test(token)) return "day";
    return "time";
}

/** Token kinds of the periods that contain the whole period (docs/adr/0040) */
const ALLOWED: Record<IGranularity, TokenKind[]> = {
    day: ["year", "month", "day", "weekYear", "week"],
    week: ["weekYear", "week"],
    month: ["year", "month"],
    quarter: ["year", "quarter"],
    year: ["year"],
};

/** The tokens the period's format may not use, each once, in the order they appear */
export function disallowedTokens(format: string, granularity: IGranularity): string[] {
    const tokens = tokenize(format).flatMap((p) => (p.kind === "token" ? [p.token] : []));
    const kinds = new Set(tokens.map(kindOf));
    const allowed = (kind: TokenKind) => {
        if (!ALLOWED[granularity].includes(kind)) return false;
        // a day may be named by its ISO week date (GGGG-[W]WW-E): the week-based year and the week only together
        if (granularity === "day" && kind === "weekYear") return kinds.has("week");
        if (granularity === "day" && kind === "week") return kinds.has("weekYear");
        return true;
    };
    return [...new Set(tokens.filter((t) => !allowed(kindOf(t))))];
}

/**
 * What the period's format lacks to name one period, for the settings' error, or null. Checked after disallowedTokens,
 * so it only looks at tokens the period may use
 */
export function missingTokens(format: string, granularity: IGranularity): string | null {
    const tokens = tokenize(format).flatMap((p) => (p.kind === "token" ? [p.token] : []));
    const has = (kind: TokenKind) => tokens.some((t) => kindOf(t) === kind);
    if (granularity === "day" && tokens.some((t) => /^(LL?|ll?)$/.test(t))) return null;
    // Calendared: name only the year tokens the period may use
    if (granularity === "week") {
        if (!has("weekYear")) return "year (GG or gg)";
    } else if (granularity === "day") {
        if (!has("year") && !has("weekYear")) return "year (Y, or GG with W)";
    } else if (!has("year")) return "year (Y)";
    switch (granularity) {
        case "quarter":
            return has("quarter") ? null : "quarter (Q)";
        case "month":
            return has("month") ? null : "month (M)";
        case "week":
            return has("week") ? null : "week (w or W)";
        case "day":
            // an ISO week date (GGGG-[W]WW-E) names the day by its weekday
            if (has("week")) return tokens.some((t) => /^(d+|do|e|E)$/.test(t)) ? null : "weekday (E)";
            if (!has("month")) return "month (M)";
            return tokens.some((t) => /^D+$|^D+o$/.test(t)) ? null : "day (D)";
        case "year":
            return null;
    }
}

export type TokenGuideItem ={ token: string; meaning: string };

const YEAR_SHORT: TokenGuideItem = { token: "YY", meaning: "two-digit year" };
const MONTH_NAMES: TokenGuideItem[] = [
    { token: "M", meaning: "month without a leading zero" },
    { token: "MMM", meaning: "short month name (Oct)" },
    { token: "MMMM", meaning: "month name (October)" },
];

/**
 * The tokens shown under a period's format field, in place of a link to Moment.js's documentation: the ones a name
 * needs, then other common ones. Each is one the period may use (docs/adr/0042)
 */
export function formatTokenGuide(granularity: IGranularity): { required: TokenGuideItem[]; optional: TokenGuideItem[] } {
    switch (granularity) {
        case "day":
            return {
                required: [
                    { token: "YYYY", meaning: "year" },
                    { token: "MM", meaning: "month" },
                    { token: "DD", meaning: "day" },
                ],
                optional: [
                    YEAR_SHORT,
                    ...MONTH_NAMES,
                    { token: "D", meaning: "day without a leading zero" },
                    { token: "ddd", meaning: "short weekday name (Mon)" },
                    { token: "dddd", meaning: "weekday name (Monday)" },
                ],
            };
        case "week":
            return {
                required: [
                    { token: "GGGG", meaning: "ISO week-numbering year" },
                    { token: "WW", meaning: "ISO week number" },
                ],
                optional: [{ token: "W", meaning: "week number without a leading zero" }],
            };
        case "month":
            return {
                required: [
                    { token: "YYYY", meaning: "year" },
                    { token: "MM", meaning: "month" },
                ],
                optional: [YEAR_SHORT, ...MONTH_NAMES],
            };
        case "quarter":
            return {
                required: [
                    { token: "YYYY", meaning: "year" },
                    { token: "Q", meaning: "quarter (1–4)" },
                ],
                optional: [YEAR_SHORT],
            };
        case "year":
            return { required: [{ token: "YYYY", meaning: "year" }], optional: [YEAR_SHORT] };
    }
}
