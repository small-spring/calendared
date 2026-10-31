import { describe, expect, it } from "vitest";
import { granularities } from "@/constants";
import type { IGranularity } from "@/io";
import { calendarView, openAtStartupOf, setOpenAtStartup, setPeriodEnabled } from "./period-switch";

type Periods = Record<IGranularity, { enabled: boolean; openAtStartup: boolean }>;
const periods = (on: IGranularity[], startup?: IGranularity): Periods =>
    Object.fromEntries(granularities.map((g) => [g, { enabled: on.includes(g), openAtStartup: g === startup }])) as Periods;
const enabled = (p: Periods) => granularities.filter((g) => p[g].enabled);

describe("setPeriodEnabled: 周期のオン・オフ", () => {
    it("その周期だけが変わる", () => {
        expect(enabled(setPeriodEnabled(periods(["day"]), "month", true))).toEqual(["day", "month"]);
        expect(enabled(setPeriodEnabled(periods(["day", "year"]), "year", false))).toEqual(["day"]);
    });

    it("週と日、四半期と月は連動しない。週だけ・四半期だけでも使える", () => {
        expect(enabled(setPeriodEnabled(periods(["day", "week", "month"]), "day", false))).toEqual(["week", "month"]);
        expect(enabled(setPeriodEnabled(periods(["month"]), "week", true))).toEqual(["week", "month"]);
        expect(enabled(setPeriodEnabled(periods(["day", "month", "quarter"]), "month", false))).toEqual(["day", "quarter"]);
        expect(enabled(setPeriodEnabled(periods(["day"]), "quarter", true))).toEqual(["day", "quarter"]);
    });

    it("最後の 1 つはオフにできない（カレンダーに出すものがなくなる）", () => {
        expect(enabled(setPeriodEnabled(periods(["week"]), "week", false))).toEqual(["week"]);
        expect(enabled(setPeriodEnabled(periods(["year"]), "year", false))).toEqual(["year"]);
        expect(enabled(setPeriodEnabled(periods(["day", "week"]), "day", false))).toEqual(["week"]);
    });

    it("元の設定は書き換えない", () => {
        const before = periods(["day", "week"]);
        setPeriodEnabled(before, "day", false);
        expect(enabled(before)).toEqual(["day", "week"]);
    });
});

describe("起動時に開く周期: 設定は周期ごとの openAtStartup のまま、1 つの選択肢として読み書きする", () => {
    it("オンの周期のうち openAtStartup のものを返す。なければ none", () => {
        expect(openAtStartupOf(periods(["day", "week"], "week"))).toBe("week");
        expect(openAtStartupOf(periods(["day"]))).toBe("none");
        // オフの周期は起動時に開かない（src/io/utils.ts）
        expect(openAtStartupOf(periods(["day"], "month"))).toBe("none");
    });

    it("選んだ周期だけを openAtStartup にする。none ならどれもしない", () => {
        const chosen = setOpenAtStartup(periods(["day", "week"], "day"), "week");
        expect(granularities.filter((g) => chosen[g].openAtStartup)).toEqual(["week"]);
        const none = setOpenAtStartup(periods(["day", "week"], "day"), "none");
        expect(granularities.filter((g) => none[g].openAtStartup)).toEqual([]);
    });
});

describe("calendarView: カレンダーに出すビュー", () => {
    const on = (gs: IGranularity[]) => Object.fromEntries(granularities.map((g) => [g, gs.includes(g)])) as Record<IGranularity, boolean>;

    it("日か週がオンなら日のビュー", () => {
        expect(calendarView(on(["day", "week", "month", "quarter", "year"]))).toBe("day");
        expect(calendarView(on(["week", "year"]))).toBe("day");
    });

    it("日と週がオフなら月のビュー、月と四半期もオフなら年のビュー", () => {
        expect(calendarView(on(["month", "year"]))).toBe("month");
        expect(calendarView(on(["quarter"]))).toBe("month");
        expect(calendarView(on(["year"]))).toBe("year");
    });

    it("オンの周期だけで決まり、前のビューを引きずらない（日をオンに戻せば日のビューに戻る）", () => {
        expect(calendarView(on(["month", "year"]))).toBe("month");
        expect(calendarView(on(["day", "month", "year"]))).toBe("day");
    });
});
