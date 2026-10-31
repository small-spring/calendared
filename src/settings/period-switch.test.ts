import { describe, expect, it } from "vitest";
import { granularities } from "@/constants";
import type { IGranularity } from "@/io";
import { openAtStartupOf, setOpenAtStartup, setPeriodEnabled } from "./period-switch";

type Periods = Record<IGranularity, { enabled: boolean; openAtStartup: boolean }>;
const periods = (on: IGranularity[], startup?: IGranularity): Periods =>
    Object.fromEntries(granularities.map((g) => [g, { enabled: on.includes(g), openAtStartup: g === startup }])) as Periods;
const enabled = (p: Periods) => granularities.filter((g) => p[g].enabled);

describe("setPeriodEnabled: 周期のオン・オフ（設定画面の Period.svelte にあった決まりを移した）", () => {
    it("ふつうはその周期だけが変わる", () => {
        expect(enabled(setPeriodEnabled(periods(["day"]), "month", true))).toEqual(["day", "month"]);
        expect(enabled(setPeriodEnabled(periods(["day", "year"]), "year", false))).toEqual(["day"]);
    });

    it("週は日を使うので、日をオフにすると週もオフになり、週をオンにすると日もオンになる", () => {
        expect(enabled(setPeriodEnabled(periods(["day", "week", "month"]), "day", false))).toEqual(["month"]);
        expect(enabled(setPeriodEnabled(periods(["month"]), "week", true))).toEqual(["day", "week", "month"]);
    });

    it("四半期は月を使うので、月をオフにすると四半期もオフになり、四半期をオンにすると月もオンになる", () => {
        expect(enabled(setPeriodEnabled(periods(["day", "month", "quarter"]), "month", false))).toEqual(["day"]);
        expect(enabled(setPeriodEnabled(periods(["day"]), "quarter", true))).toEqual(["day", "month", "quarter"]);
    });

    it("日・月・年がすべてオフにはならない。最後の 1 つの日はオフにできず、月・年を最後にオフにすると日がオンになる", () => {
        expect(enabled(setPeriodEnabled(periods(["day", "week"]), "day", false))).toEqual(["day", "week"]);
        expect(enabled(setPeriodEnabled(periods(["month", "quarter"]), "month", false))).toEqual(["day"]);
        expect(enabled(setPeriodEnabled(periods(["year"]), "year", false))).toEqual(["day"]);
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
