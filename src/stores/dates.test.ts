import moment from "moment";
import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { periodRules } from "@/periods";
import { createIsoWeekScheme } from "@/weeks";
import { mondayWeeks } from "@/test-fixtures";

// years from April; "start": April 2031 – March 2032 is 2031, "end": it is 2032
const aprilStart = periodRules(createIsoWeekScheme(1), { year: { startMonth: 4, yearInName: "start" } });
const aprilEnd = periodRules(createIsoWeekScheme(1), { year: { startMonth: 4, yearInName: "end" } });

describe("年のビューの 12 年の区切り（yearsRanges）", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function load() {
    return await import("./dates");
  }

  it("はじめの区切りは 2020 年から 2031 年", async () => {
    const { yearsRanges } = await load();
    expect(get(yearsRanges)).toEqual({
      ranges: ["2020-2031"],
      todayRange: "2020-2031",
      crrRangeIndex: 0,
    });
  });

  it("表示している年が区切りより後なら、12 年ずつ後ろに区切りを足してそこを選ぶ", async () => {
    const { yearsRanges, displayedDateStore } = await load();
    displayedDateStore.set(moment("2045-06-01"));
    yearsRanges.selectOrCreateRanges(mondayWeeks);
    const { ranges, crrRangeIndex } = get(yearsRanges);
    expect(ranges).toEqual(["2020-2031", "2032-2043", "2044-2055"]);
    expect(crrRangeIndex).toBe(2);
  });

  it("表示している年が区切りより前なら、12 年ずつ前に区切りを足してそこを選ぶ", async () => {
    const { yearsRanges, displayedDateStore } = await load();
    displayedDateStore.set(moment("2001-06-01"));
    yearsRanges.selectOrCreateRanges(mondayWeeks);
    const { ranges, crrRangeIndex } = get(yearsRanges);
    expect(ranges).toEqual(["1996-2007", "2008-2019", "2020-2031"]);
    expect(crrRangeIndex).toBe(0);
  });

  describe("年が 1 月に始まらないとき、区切りは年の名前で数える（年のビューのマスと同じ）", () => {
    it("表示している日付の年の名前を含む区切りを選ぶ", async () => {
      const { yearsRanges, displayedDateStore } = await load();
      // 2032-02 is in April 2031 – March 2032, named 2031
      displayedDateStore.set(moment("2032-02-01"));
      yearsRanges.selectOrCreateRanges(aprilStart);
      const { ranges, crrRangeIndex } = get(yearsRanges);
      expect(ranges[crrRangeIndex]).toBe("2020-2031");
    });

    it("今日の年の名前を含む区切りが、今の区切り", async () => {
      vi.useFakeTimers();
      // 2031-11 is in April 2031 – March 2032, named 2032 with the year it ends in
      vi.setSystemTime(new Date(2031, 10, 1));
      const { yearsRanges } = await load();
      yearsRanges.selectOrCreateRanges(aprilEnd);
      expect(get(yearsRanges).todayRange).toBe("2032-2043");
    });

    it("次の区切りへ進むと、その最初の年の名前の始まりの日を表示する", async () => {
      const { yearsRanges, displayedDateStore } = await load();
      displayedDateStore.set(moment("2026-06-01"));
      yearsRanges.selectOrCreateRanges(aprilStart);
      yearsRanges.updateRanges({ action: "increment", rules: aprilStart });
      expect(get(displayedDateStore).format("YYYY-MM-DD")).toBe("2032-04-01");
      yearsRanges.selectOrCreateRanges(aprilStart);
      expect(get(yearsRanges).ranges[get(yearsRanges).crrRangeIndex]).toBe("2032-2043");
    });

    it("前の区切りへ戻ると、その最初の年の名前の始まりの日を表示する", async () => {
      const { yearsRanges, displayedDateStore } = await load();
      displayedDateStore.set(moment("2026-06-01"));
      yearsRanges.selectOrCreateRanges(aprilEnd);
      yearsRanges.updateRanges({ action: "decrement", displayedDateModifier: -12, rules: aprilEnd });
      // named 2008 with the year it ends in: April 2007 – March 2008
      expect(get(displayedDateStore).format("YYYY-MM-DD")).toBe("2007-04-01");
      yearsRanges.selectOrCreateRanges(aprilEnd);
      expect(get(yearsRanges).ranges[get(yearsRanges).crrRangeIndex]).toBe("2008-2019");
    });
  });
});

describe("refreshToday: 時計から「今日」を読み直す（1 分ごとと、今のノートを開く前）", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("日付が変わっていれば今日を新しくして返す。今日の月を見ていたら、表示も新しい月へ", async () => {
    const { refreshToday, todayStore, displayedDateStore } = await import("./dates");
    todayStore.set(moment("2026-10-31"));
    displayedDateStore.set(moment("2026-10-31"));
    vi.useFakeTimers({ now: new Date(2026, 10, 1, 0, 0, 30) });
    expect(refreshToday().format("YYYY-MM-DD")).toBe("2026-11-01");
    expect(get(todayStore).format("YYYY-MM-DD")).toBe("2026-11-01");
    expect(get(displayedDateStore).format("YYYY-MM-DD")).toBe("2026-11-01");
  });

  it("同じ日のうちは、今日のストアを変えない", async () => {
    const { refreshToday, todayStore } = await import("./dates");
    vi.useFakeTimers({ now: new Date(2026, 10, 1, 9, 0) });
    const today = moment("2026-11-01");
    todayStore.set(today);
    vi.setSystemTime(new Date(2026, 10, 1, 18, 0));
    expect(refreshToday()).toBe(today);
  });
});
