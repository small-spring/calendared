import moment from "moment";
import { describe, expect, it } from "vitest";
import { checkWeekFormat, createIsoWeekScheme, isoWeekFormatFor, toSupportedWeekStart, weekSchemeFor, type WeekName, type WeekScheme } from "./weeks";

// The week scheme decides what a "week" is (docs/periods.md, ADR-003/004/006).
// Week starts use moment's day numbers: 6 = Saturday, 0 = Sunday, 1 = Monday

const d = (s: string) => moment(s, "YYYY-MM-DD");
const ymd = (m: moment.Moment) => m.format("YYYY-MM-DD");
const week = (weekYear: number, weekNumber: number): WeekName => ({ weekYear, week: weekNumber });

const monday = createIsoWeekScheme(1);
const sunday = createIsoWeekScheme(0);
const saturday = createIsoWeekScheme(6);

describe("ISO の週の決め方: ある日を含む週", () => {
    it("月曜はじまりなら ISO 8601 の週そのもの", () => {
        expect(monday.weekOf(d("2026-10-29"))).toEqual(week(2026, 44));
        expect(monday.weekOf(d("2026-10-26"))).toEqual(week(2026, 44));
        expect(monday.weekOf(d("2026-11-01"))).toEqual(week(2026, 44));
    });

    it("日曜はじまりでも、行の月曜日の番号になる（Google カレンダーで確かめたとおり）", () => {
        // the row Sun 10-25 – Sat 10-31; the Sunday alone would be ISO week 43
        expect(sunday.weekOf(d("2026-10-25"))).toEqual(week(2026, 44));
        expect(sunday.weekOf(d("2026-10-31"))).toEqual(week(2026, 44));
        expect(sunday.weekOf(d("2026-11-01"))).toEqual(week(2026, 45));
    });

    it("土曜はじまりでも、行の月曜日の番号になる", () => {
        // the row Sat 10-24 – Fri 10-30
        expect(saturday.weekOf(d("2026-10-24"))).toEqual(week(2026, 44));
        expect(saturday.weekOf(d("2026-10-30"))).toEqual(week(2026, 44));
        expect(saturday.weekOf(d("2026-10-31"))).toEqual(week(2026, 45));
    });

    it("年をまたぐ行は、週の年（行の月曜日の ISO の年）の週になる", () => {
        expect(monday.weekOf(d("2027-01-03"))).toEqual(week(2026, 53));
        expect(sunday.weekOf(d("2026-12-27"))).toEqual(week(2026, 53)); // Google: 53 in both December and January
        expect(sunday.weekOf(d("2027-01-02"))).toEqual(week(2026, 53));
        expect(monday.weekOf(d("2025-12-29"))).toEqual(week(2026, 1)); // calendar year 2025, week year 2026
    });
});

describe("ISO の週の決め方: 週の期間（カレンダーの 1 行）", () => {
    it("週の始まりの設定に合わせた 7 日間", () => {
        const range = (scheme: WeekScheme) => {
            const { start, end } = scheme.rangeOf(week(2026, 44))!;
            return [ymd(start), ymd(end)];
        };
        expect(range(monday)).toEqual(["2026-10-26", "2026-11-01"]);
        expect(range(sunday)).toEqual(["2026-10-25", "2026-10-31"]);
        expect(range(saturday)).toEqual(["2026-10-24", "2026-10-30"]);
    });

    it("存在しない週（2027 年の第 53 週）は期間を持たない", () => {
        expect(monday.rangeOf(week(2027, 53))).toBeNull();
    });
});

describe("ISO の週の決め方: 前・次の週", () => {
    it("年の変わり目でも正しい（52 週の年と 53 週の年）", () => {
        expect(monday.shift(week(2026, 52), 1)).toEqual(week(2026, 53));
        expect(monday.shift(week(2026, 53), 1)).toEqual(week(2027, 1));
        expect(monday.shift(week(2027, 52), 1)).toEqual(week(2028, 1)); // not the nonexistent 2027-W53
        expect(monday.shift(week(2027, 1), -1)).toEqual(week(2026, 53));
    });
});

describe("ISO の週の決め方: 週次ノートのファイル名", () => {
    it("書式 GGGG-[W]WW で書き、読む", () => {
        expect(sunday.format(week(2026, 44), "GGGG-[W]WW")).toBe("2026-W44");
        expect(sunday.parse("2026-W44", "GGGG-[W]WW")).toEqual(week(2026, 44));
        expect(monday.format(week(2026, 1), "GGGG-[W]WW")).toBe("2026-W01"); // its Monday is 2025-12-29
    });

    it("言語の週の書式（ww, gggg）で作った名前も、同じ番号の行として読む（元の版で作ったノート）", () => {
        // in Japanese, "2026-W44" in these formats means Sun 10-25 – Sat 10-31; read it as the row that shares most of its days
        moment.locale("ja");
        expect(monday.parse("2026-W44", "YYYY-[W]ww")).toEqual(week(2026, 44));
        expect(monday.parse("2026-W44", "gggg-[W]ww")).toEqual(week(2026, 44));
        expect(sunday.parse("2026-W44", "gggg-[W]ww")).toEqual(week(2026, 44));
    });

    it("存在しない週や形式に合わない名前は読まない", () => {
        expect(monday.parse("2027-W53", "GGGG-[W]WW")).toBeNull();
        expect(monday.parse("2026-W44 memo", "GGGG-[W]WW")).toBeNull();
    });
});

describe("設定から週の決め方を選ぶ", () => {
    it("週の始まりは土・日・月だけ。ほかの曜日は近いほうへ寄せる", () => {
        expect([0, 1, 2, 3, 4, 5, 6].map(toSupportedWeekStart)).toEqual([0, 1, 1, 1, 1, 6, 6]);
    });

    it("決め方はいつも ISO（週の始まりだけを設定から読む）", () => {
        expect(weekSchemeFor({ weekStartId: 0 }).weekOf(d("2026-10-25"))).toEqual(week(2026, 44));
        expect(weekSchemeFor({ weekStartId: 3 }).rangeOf(week(2026, 44))!.start.format("YYYY-MM-DD")).toBe("2026-10-26");
    });
});

describe("週次ノートの書式の確かめ（設定画面の注意に使う）", () => {
    it("ISO の書式（GGGG と WW）は、どの週も読めて、番号もカレンダーと同じ", () => {
        expect(checkWeekFormat("GGGG-[W]WW", monday)).toEqual({ unreadable: null, mismatched: null });
        expect(checkWeekFormat("GGGG-[W]WW", sunday)).toEqual({ unreadable: null, mismatched: null });
        expect(checkWeekFormat("GGGG年第WW週", saturday)).toEqual({ unreadable: null, mismatched: null });
    });

    it("YYYY と ww を混ぜた書式は、年の変わり目に読めない週がある（例を返す）", () => {
        moment.locale("ja");
        const { unreadable } = checkWeekFormat("YYYY-[W]ww", monday);
        // the earliest week checked that breaks: week 1 of 2025 starts Mon 2024-12-30 and is written "2024-W01"
        expect(unreadable).toEqual({ week: week(2025, 1), name: "2024-W01" });
    });

    it("gggg と ww（言語の決まり）は読めるが、番号がカレンダーとずれる週がある（例を返す）", () => {
        moment.locale("ja");
        const { unreadable, mismatched } = checkWeekFormat("gggg-[W]ww", monday);
        expect(unreadable).toBeNull();
        expect(mismatched).not.toBeNull();
        expect(mismatched!.name).not.toBe(mismatched!.expected);
    });

    it("おすすめの書式は、ユーザーの書式の文字だけを ISO に替えて作る（[] の中と、ほかの文字はそのまま）", () => {
        expect(isoWeekFormatFor("YYYY-[W]ww")).toBe("GGGG-[W]WW");
        expect(isoWeekFormatFor("gggg-[W]ww")).toBe("GGGG-[W]WW");
        expect(isoWeekFormatFor("gggg年第ww週")).toBe("GGGG年第WW週");
        expect(isoWeekFormatFor("[www] gg-w")).toBe("[www] GG-W");
        expect(isoWeekFormatFor("GGGG-[W]WW")).toBe("GGGG-[W]WW");
    });
});

// Promises every week scheme must keep (ADR-006). A new scheme only needs to be added to this list
describe.each([
    ["月曜はじまり", monday],
    ["日曜はじまり", sunday],
    ["土曜はじまり", saturday],
])("どの週の決め方でも守る約束（%s）", (_, scheme) => {
    // three years around the year ends 2025/2026/2027
    const days = Array.from({ length: 365 * 3 }, (_, i) => d("2025-06-01").add(i, "days"));

    it("どの日も、自分を含む週の期間の中にある（隙間も重なりもない）", () => {
        for (const day of days) {
            const range = scheme.rangeOf(scheme.weekOf(day));
            expect(range).not.toBeNull();
            expect(day.isBetween(range!.start, range!.end, "day", "[]")).toBe(true);
        }
    });

    it("週の期間の最初の日から週を求めると、元の週に戻る", () => {
        for (const day of days) {
            const w = scheme.weekOf(day);
            expect(scheme.weekOf(scheme.rangeOf(w)!.start)).toEqual(w);
        }
    });

    it("次の週は、期間の最後の日の翌日を含む週。前の週の次は元の週", () => {
        for (const day of days) {
            const w = scheme.weekOf(day);
            expect(scheme.shift(w, 1)).toEqual(scheme.weekOf(scheme.rangeOf(w)!.end.clone().add(1, "day")));
            expect(scheme.shift(scheme.shift(w, -1), 1)).toEqual(w);
        }
    });

    it("ファイル名に書いて読むと、元の週に戻る", () => {
        for (const day of days) {
            const w = scheme.weekOf(day);
            expect(scheme.parse(scheme.format(w, "GGGG-[W]WW"), "GGGG-[W]WW")).toEqual(w);
        }
    });
});
