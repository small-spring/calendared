import moment from "moment";
import { describe, expect, it } from "vitest";
import {
    formatPeriod,
    overlapsMonth,
    parsePeriod,
    periodOf,
    periodRules,
    cycleYearLabel,
    rangeOfPeriod,
    renameForFormat,
    shiftPeriod,
    type PeriodName,
} from "./periods";
import { createIsoWeekScheme } from "./weeks";

const d = (s: string) => moment(s, "YYYY-MM-DD");

// ---- Period names and operations (docs/adr/0009, 0010) ----

const mondayWeeks = periodRules(createIsoWeekScheme(1));
const sundayWeeks = periodRules(createIsoWeekScheme(0));
const FORMATS = { day: "YYYY-MM-DD", week: "GGGG-[W]WW", month: "YYYY-MM", quarter: "YYYY-[Q]Q", year: "YYYY" } as const;
const range = (p: PeriodName, weeks = mondayWeeks) => {
    const r = rangeOfPeriod(p, weeks);
    return r && [r.start.format("YYYY-MM-DD"), r.end.format("YYYY-MM-DD")];
};

describe("periodOf: ある日を含む区切りの名前", () => {
    it("日・月・四半期・年は暦どおり（月は 1〜12）", () => {
        const date = d("2026-10-29");
        expect(periodOf("day", date, mondayWeeks)).toEqual({ granularity: "day", year: 2026, month: 10, day: 29 });
        expect(periodOf("month", date, mondayWeeks)).toEqual({ granularity: "month", year: 2026, month: 10 });
        expect(periodOf("quarter", date, mondayWeeks)).toEqual({ granularity: "quarter", year: 2026, quarter: 4 });
        expect(periodOf("year", date, mondayWeeks)).toEqual({ granularity: "year", year: 2026 });
    });

    it("週は週の決め方に聞く", () => {
        expect(periodOf("week", d("2026-10-25"), sundayWeeks)).toEqual({ granularity: "week", weekYear: 2026, week: 44 });
        expect(periodOf("week", d("2026-10-25"), mondayWeeks)).toEqual({ granularity: "week", weekYear: 2026, week: 43 });
    });
});

describe("rangeOfPeriod: 区切りの期間", () => {
    it("各周期の最初の日と最後の日", () => {
        expect(range({ granularity: "day", year: 2026, month: 10, day: 29 })).toEqual(["2026-10-29", "2026-10-29"]);
        expect(range({ granularity: "month", year: 2026, month: 2 })).toEqual(["2026-02-01", "2026-02-28"]);
        expect(range({ granularity: "quarter", year: 2026, quarter: 4 })).toEqual(["2026-10-01", "2026-12-31"]);
        expect(range({ granularity: "year", year: 2026 })).toEqual(["2026-01-01", "2026-12-31"]);
        expect(range({ granularity: "week", weekYear: 2026, week: 44 }, sundayWeeks)).toEqual(["2026-10-25", "2026-10-31"]);
    });
});

describe("shiftPeriod: 前・次の区切り", () => {
    it("年の変わり目をまたいでも正しい", () => {
        expect(shiftPeriod({ granularity: "day", year: 2026, month: 12, day: 31 }, 1, mondayWeeks)).toEqual({ granularity: "day", year: 2027, month: 1, day: 1 });
        expect(shiftPeriod({ granularity: "month", year: 2026, month: 1 }, -1, mondayWeeks)).toEqual({ granularity: "month", year: 2025, month: 12 });
        expect(shiftPeriod({ granularity: "quarter", year: 2026, quarter: 4 }, 1, mondayWeeks)).toEqual({ granularity: "quarter", year: 2027, quarter: 1 });
        expect(shiftPeriod({ granularity: "year", year: 2026 }, -1, mondayWeeks)).toEqual({ granularity: "year", year: 2025 });
        expect(shiftPeriod({ granularity: "week", weekYear: 2027, week: 52 }, 1, mondayWeeks)).toEqual({ granularity: "week", weekYear: 2028, week: 1 });
    });
});

describe("overlapsMonth: 表示中の月（2026 年 9 月）に見えているか", () => {
    const september = d("2026-09-15");

    it("期間が 9 月と重なっていれば見えている。日・週・月・期・年で同じ考え方", () => {
        expect(overlapsMonth({ granularity: "day", year: 2026, month: 9, day: 1 }, september, mondayWeeks)).toBe(true);
        expect(overlapsMonth({ granularity: "day", year: 2026, month: 10, day: 1 }, september, mondayWeeks)).toBe(false);
        expect(overlapsMonth({ granularity: "month", year: 2025, month: 9 }, september, mondayWeeks)).toBe(false);
        expect(overlapsMonth({ granularity: "quarter", year: 2026, quarter: 3 }, september, mondayWeeks)).toBe(true);
        expect(overlapsMonth({ granularity: "year", year: 2026 }, september, mondayWeeks)).toBe(true);
        expect(overlapsMonth({ granularity: "year", year: 2027 }, september, mondayWeeks)).toBe(false);
    });

    it("月をまたぐ週も、どれかの日が 9 月なら見えている", () => {
        expect(overlapsMonth({ granularity: "week", weekYear: 2026, week: 36 }, september, mondayWeeks)).toBe(true); // Aug 31 – Sep 6
        expect(overlapsMonth({ granularity: "week", weekYear: 2026, week: 40 }, september, mondayWeeks)).toBe(true); // Sep 28 – Oct 4
        expect(overlapsMonth({ granularity: "week", weekYear: 2026, week: 35 }, september, mondayWeeks)).toBe(false); // Aug 24 – Aug 30
    });
});

describe("formatPeriod / parsePeriod: ファイル名", () => {
    it("各周期の書式で書いて読む", () => {
        const cases: PeriodName[] = [
            { granularity: "day", year: 2026, month: 10, day: 29 },
            { granularity: "week", weekYear: 2026, week: 1 },
            { granularity: "month", year: 2026, month: 10 },
            { granularity: "quarter", year: 2026, quarter: 4 },
            { granularity: "year", year: 2026 },
        ];
        expect(cases.map((p) => formatPeriod(p, FORMATS[p.granularity], mondayWeeks))).toEqual([
            "2026-10-29", "2026-W01", "2026-10", "2026-Q4", "2026",
        ]);
        for (const p of cases) {
            expect(parsePeriod(formatPeriod(p, FORMATS[p.granularity], mondayWeeks), p.granularity, FORMATS[p.granularity], mondayWeeks)).toEqual(p);
        }
    });

    it("形式に合わない名前や、存在しない区切りは読まない", () => {
        expect(parsePeriod("2026-13", "month", FORMATS.month, mondayWeeks)).toBeNull();
        expect(parsePeriod("2027-W53", "week", FORMATS.week, mondayWeeks)).toBeNull();
        expect(parsePeriod("メモ", "day", FORMATS.day, mondayWeeks)).toBeNull();
    });

    it("読めても、同じ書式で書き戻して同じ名前にならないものは読まない（どの周期・区切りでも）", () => {
        // moment reads month names in any case; the name the format writes is "October"
        expect(parsePeriod("2026-october", "month", "YYYY-MMMM", mondayWeeks)).toBeNull();
        expect(parsePeriod("2026-october-30", "day", "YYYY-MMMM-DD", mondayWeeks)).toBeNull();
        expect(parsePeriod("2026-October", "month", "YYYY-MMMM", mondayWeeks)).toEqual({ granularity: "month", year: 2026, month: 10 });
    });
});

describe.each(["day", "week", "month", "quarter", "year"] as const)("どの周期でも守る約束（%s）", (granularity) => {
    const days = Array.from({ length: 800 }, (_, i) => d("2025-11-01").add(i, "days"));

    it("ある日を含む区切りの期間に、その日が入っている", () => {
        for (const day of days) {
            const r = rangeOfPeriod(periodOf(granularity, day, sundayWeeks), sundayWeeks)!;
            expect(day.isBetween(r.start, r.end, "day", "[]")).toBe(true);
        }
    });

    it("前の次は元に戻り、次は期間の最後の翌日を含む区切り", () => {
        for (const day of days) {
            const p = periodOf(granularity, day, sundayWeeks);
            expect(shiftPeriod(shiftPeriod(p, -1, sundayWeeks), 1, sundayWeeks)).toEqual(p);
            const next = periodOf(granularity, rangeOfPeriod(p, sundayWeeks)!.end.clone().add(1, "day"), sundayWeeks);
            expect(shiftPeriod(p, 1, sundayWeeks)).toEqual(next);
        }
    });
});

// ---- 四半期と年の始まりの月（docs/adr/0039） ----

const may = { startMonth: 5, yearInName: "start" } as const;
const mayEnd = { startMonth: 5, yearInName: "end" } as const;
const mayRules = periodRules(createIsoWeekScheme(1), { quarter: may, year: may });
const mayEndRules = periodRules(createIsoWeekScheme(1), { quarter: mayEnd, year: mayEnd });

describe("5 月始まりの四半期と年", () => {
    it("Q は始まりの月から数え、年の数字は 12 か月が始まる年", () => {
        expect(periodOf("quarter", d("2026-05-01"), mayRules)).toEqual({ granularity: "quarter", year: 2026, quarter: 1 });
        expect(periodOf("quarter", d("2026-10-29"), mayRules)).toEqual({ granularity: "quarter", year: 2026, quarter: 2 });
        expect(periodOf("quarter", d("2027-03-15"), mayRules)).toEqual({ granularity: "quarter", year: 2026, quarter: 4 });
        expect(periodOf("year", d("2027-04-30"), mayRules)).toEqual({ granularity: "year", year: 2026 });
        expect(periodOf("year", d("2027-05-01"), mayRules)).toEqual({ granularity: "year", year: 2027 });
    });

    it("終わりの年で呼ぶと、同じ期間の数字が 1 つ大きい", () => {
        expect(periodOf("quarter", d("2027-03-15"), mayEndRules)).toEqual({ granularity: "quarter", year: 2027, quarter: 4 });
        expect(periodOf("year", d("2026-05-01"), mayEndRules)).toEqual({ granularity: "year", year: 2027 });
        expect(range({ granularity: "year", year: 2027 }, mayEndRules)).toEqual(["2026-05-01", "2027-04-30"]);
    });

    it("期間は始まりの月から 3 か月・12 か月", () => {
        expect(range({ granularity: "quarter", year: 2026, quarter: 4 }, mayRules)).toEqual(["2027-02-01", "2027-04-30"]);
        expect(range({ granularity: "year", year: 2026 }, mayRules)).toEqual(["2026-05-01", "2027-04-30"]);
        expect(shiftPeriod({ granularity: "quarter", year: 2026, quarter: 4 }, 1, mayRules)).toEqual({ granularity: "quarter", year: 2027, quarter: 1 });
    });

    it("名前の YYYY と Q は、その周期の数字で書いて読む", () => {
        const q4 = { granularity: "quarter", year: 2026, quarter: 4 } as const;
        expect(formatPeriod(q4, "YYYY-[Q]Q", mayRules)).toBe("2026-Q4");
        expect(parsePeriod("2026-Q4", "quarter", "YYYY-[Q]Q", mayRules)).toEqual(q4);
        expect(formatPeriod({ granularity: "year", year: 2026 }, "YYYY", mayRules)).toBe("2026");
        expect(formatPeriod({ granularity: "year", year: 2027 }, "[FY]YY", mayEndRules)).toBe("FY27");
        expect(parsePeriod("2026", "year", "YYYY", mayRules)).toEqual({ granularity: "year", year: 2026 });
    });

    it("四半期と年は、別々の月から始められる（年は暦どおり、四半期だけ 5 月始まり）", () => {
        const rules = periodRules(createIsoWeekScheme(1), { quarter: may });
        expect(periodOf("year", d("2027-03-15"), rules)).toEqual({ granularity: "year", year: 2027 });
        expect(periodOf("quarter", d("2027-03-15"), rules)).toEqual({ granularity: "quarter", year: 2026, quarter: 4 });
    });

    it("見出しの年: 1 月始まりは「2026」、ほかは「2026–27」（名前の付け方によらない）", () => {
        expect(cycleYearLabel({ granularity: "year", year: 2026 }, { startMonth: 1, yearInName: "start" })).toBe("2026");
        expect(cycleYearLabel({ granularity: "year", year: 2026 }, may)).toBe("2026–27");
        expect(cycleYearLabel({ granularity: "year", year: 2027 }, mayEnd)).toBe("2026–27");
    });
});

describe.each([
    ["5 月・始まりの年", mayRules],
    ["5 月・終わりの年", mayEndRules],
    ["2 月", periodRules(createIsoWeekScheme(1), { quarter: { startMonth: 2, yearInName: "start" }, year: { startMonth: 12, yearInName: "end" } })],
] as const)("始まりの月を変えても守る約束（%s）", (_, rules) => {
    const days = Array.from({ length: 800 }, (_, i) => d("2025-11-01").add(i, "days"));

    it.each(["quarter", "year"] as const)("%s: 期間に元の日が入り、前の次は元に戻り、名前は読み戻せる", (granularity) => {
        for (const day of days) {
            const p = periodOf(granularity, day, rules);
            const r = rangeOfPeriod(p, rules)!;
            expect(day.isBetween(r.start, r.end, "day", "[]")).toBe(true);
            expect(shiftPeriod(shiftPeriod(p, -1, rules), 1, rules)).toEqual(p);
            expect(periodOf(granularity, r.end.clone().add(1, "day"), rules)).toEqual(shiftPeriod(p, 1, rules));
            const format = FORMATS[granularity];
            expect(parsePeriod(formatPeriod(p, format, rules), granularity, format, rules)).toEqual(p);
        }
    });
});

describe("renameForFormat: 書式を変えたときのファイル名", () => {
    it("同じ区切りを新しい書式で書いた名前", () => {
        expect(renameForFormat("2026-10-29", "day", "YYYY-MM-DD", "YYYYMMDD", mondayWeeks)).toBe("20261029");
        expect(renameForFormat("2026-10", "month", "YYYY-MM", "YYYY年M月", mondayWeeks)).toBe("2026年10月");
    });

    it("言語の週の書式から ISO の書式へ。同じ週を同じ番号で書く（ww の名前を、日曜からの 1 週ずれで読まない）", () => {
        moment.locale("ja");
        expect(renameForFormat("2026-W44", "week", "YYYY-[W]ww", "GGGG-[W]WW", mondayWeeks)).toBe("2026-W44");
        expect(renameForFormat("2027-W01", "week", "gggg-[W]ww", "GGGG-[W]WW", mondayWeeks)).toBe("2026-W53");
    });

    it("古い書式で読めない名前は null", () => {
        expect(renameForFormat("メモ", "day", "YYYY-MM-DD", "YYYYMMDD", mondayWeeks)).toBeNull();
    });
});
