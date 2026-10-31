import moment from "moment";
import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    yearsRanges.selectOrCreateRanges();
    const { ranges, crrRangeIndex } = get(yearsRanges);
    expect(ranges).toEqual(["2020-2031", "2032-2043", "2044-2055"]);
    expect(crrRangeIndex).toBe(2);
  });

  it("表示している年が区切りより前なら、12 年ずつ前に区切りを足してそこを選ぶ", async () => {
    const { yearsRanges, displayedDateStore } = await load();
    displayedDateStore.set(moment("2001-06-01"));
    yearsRanges.selectOrCreateRanges();
    const { ranges, crrRangeIndex } = get(yearsRanges);
    expect(ranges).toEqual(["1996-2007", "2008-2019", "2020-2031"]);
    expect(crrRangeIndex).toBe(0);
  });
});
