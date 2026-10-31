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

type TokenKind = "year" | "weekYear" | "quarter" | "month" | "week" | "day" | "time";

function kindOf(token: string): TokenKind {
    if (/^(Y+|y+|yo)$/.test(token)) return "year";
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
