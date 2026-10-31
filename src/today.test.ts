import moment from "moment";
import { describe, expect, it } from "vitest";
import { nextToday } from "./today";

const at = (s: string) => moment(s, "YYYY-MM-DD HH:mm");
const ymd = (m: moment.Moment | null) => m?.format("YYYY-MM-DD") ?? null;

describe("nextToday: 1 分ごとに、今日と、カレンダーに出す月を決め直す", () => {
    it("日付が変わっていなければ、どちらも変えない（店を書き換えて、画面を作り直させない）", () => {
        const result = nextToday(at("2026-11-01 09:00"), at("2026-11-01 00:00"), at("2026-11-01 23:59"));
        expect(result).toEqual({ today: null, displayed: null });
    });

    it("日付が変わったら、今日を今にする", () => {
        const result = nextToday(at("2026-11-01 00:00"), at("2026-11-01 00:00"), at("2026-11-02 00:00"));
        expect(ymd(result.today)).toBe("2026-11-02");
        expect(result.displayed).toBeNull();
    });

    it("今月を出していて、月が変わったら、出す月も新しい今月にする", () => {
        const result = nextToday(at("2026-11-15 00:00"), at("2026-11-30 23:59"), at("2026-12-01 00:00"));
        expect(ymd(result.today)).toBe("2026-12-01");
        expect(ymd(result.displayed)).toBe("2026-12-01");
    });

    it("年をまたいでも同じ（12月を出していたら、1月にする）", () => {
        const result = nextToday(at("2026-12-10 00:00"), at("2026-12-31 23:59"), at("2027-01-01 00:00"));
        expect(ymd(result.displayed)).toBe("2027-01-01");
    });

    it("ほかの月を見ていたら、月が変わっても出す月は動かさない", () => {
        const result = nextToday(at("2026-08-01 00:00"), at("2026-11-30 23:59"), at("2026-12-01 00:00"));
        expect(ymd(result.today)).toBe("2026-12-01");
        expect(result.displayed).toBeNull();
    });

    it("去年の同じ月を見ていたら、動かさない", () => {
        const result = nextToday(at("2025-11-01 00:00"), at("2026-11-30 23:59"), at("2026-12-01 00:00"));
        expect(result.displayed).toBeNull();
    });

    it("スリープなどで 2 か月以上進んでも、今月を出していたら新しい今月にする（元の版は翌月のときだけ動かした）", () => {
        const result = nextToday(at("2026-10-01 00:00"), at("2026-10-31 00:00"), at("2026-12-02 00:00"));
        expect(ymd(result.today)).toBe("2026-12-02");
        expect(ymd(result.displayed)).toBe("2026-12-02");
    });
});
