import moment from "moment";
import { describe, expect, it } from "vitest";
import { getAdjacentPeriodDate, isNoteOnDisplayedMonth } from "./periods";

const d = (s: string) => moment(s, "YYYY-MM-DD");

describe("isNoteOnDisplayedMonth: カレンダーが 2026 年 9 月を表示しているとき", () => {
    const displayed = d("2026-09-15");

    it("年次ノートは、その年なら見えている（2026 は動かさない、2027 は動かす）", () => {
        expect(isNoteOnDisplayedMonth("year", d("2026-01-01"), displayed)).toBe(true);
        expect(isNoteOnDisplayedMonth("year", d("2027-01-01"), displayed)).toBe(false);
    });

    it("四半期ノートは、9 月を含む期（Q3）なら見えている", () => {
        expect(isNoteOnDisplayedMonth("quarter", d("2026-07-01"), displayed)).toBe(true);
        expect(isNoteOnDisplayedMonth("quarter", d("2026-10-01"), displayed)).toBe(false);
    });

    it("月次ノートは、9 月なら見えている（ほかの年の 9 月は見えていない）", () => {
        expect(isNoteOnDisplayedMonth("month", d("2026-09-01"), displayed)).toBe(true);
        expect(isNoteOnDisplayedMonth("month", d("2026-10-01"), displayed)).toBe(false);
        expect(isNoteOnDisplayedMonth("month", d("2025-09-01"), displayed)).toBe(false);
    });

    it("週次ノートは、週のどれかの日が 9 月なら見えている（月をまたぐ週も）", () => {
        // weeks given by their first day
        expect(isNoteOnDisplayedMonth("week", d("2026-09-07"), displayed)).toBe(true);
        expect(isNoteOnDisplayedMonth("week", d("2026-08-31"), displayed)).toBe(true); // Aug 31 – Sep 6
        expect(isNoteOnDisplayedMonth("week", d("2026-09-28"), displayed)).toBe(true); // Sep 28 – Oct 4
        expect(isNoteOnDisplayedMonth("week", d("2026-08-24"), displayed)).toBe(false); // Aug 24 – Aug 30
    });

    it("デイリーノートは、9 月の日なら見えている", () => {
        expect(isNoteOnDisplayedMonth("day", d("2026-09-01"), displayed)).toBe(true);
        expect(isNoteOnDisplayedMonth("day", d("2026-10-01"), displayed)).toBe(false);
        expect(isNoteOnDisplayedMonth("day", d("2025-09-15"), displayed)).toBe(false);
    });
});

describe("getAdjacentPeriodDate: 同じ周期の前・次", () => {
    it("日・週・月・四半期・年のそれぞれで 1 つずつ動く", () => {
        expect(getAdjacentPeriodDate("day", d("2026-10-29"), "next").format("YYYY-MM-DD")).toBe("2026-10-30");
        expect(getAdjacentPeriodDate("week", d("2026-10-26"), "next").format("YYYY-MM-DD")).toBe("2026-11-02");
        expect(getAdjacentPeriodDate("month", d("2026-01-01"), "previous").format("YYYY-MM-DD")).toBe("2025-12-01");
        expect(getAdjacentPeriodDate("quarter", d("2026-10-01"), "next").format("YYYY-MM-DD")).toBe("2027-01-01");
        expect(getAdjacentPeriodDate("year", d("2026-01-01"), "previous").format("YYYY-MM-DD")).toBe("2025-01-01");
    });

    it("元の日付は書き換えない", () => {
        const date = d("2026-10-29");
        getAdjacentPeriodDate("day", date, "next");
        expect(date.format("YYYY-MM-DD")).toBe("2026-10-29");
    });
});
