import moment from "moment";
import "moment/locale/en-gb";
import { describe, expect, it } from "vitest";
import { inLocale, localeWeekStart, monthGrid, obsidianMomentLocale, weekdayHeader, weekdayNames } from "./calendar-locale";
import { createIsoWeekScheme } from "./weeks";
import { d, ymd } from "@/test-fixtures";

// loading a locale switches moment to it; go back to English like test-setup.ts does
moment.locale("en");

// The calendar shows dates in its own language (the "Language" setting) without changing the moment that Obsidian
// and other plugins share (docs/todo.md, "言語の扱い").

describe("inLocale: その言語で書くための日付の複製", () => {
    it("指定した言語で書ける", () => {
        expect(inLocale(d("2026-10-30"), "ja").format("MMM")).toBe("10月");
        expect(inLocale(d("2026-10-30"), "en").format("MMM")).toBe("Oct");
    });

    it("元の日付も、Obsidian 全体の moment の言語も変えない", () => {
        const original = d("2026-10-30");
        inLocale(original, "ja");
        expect(original.locale()).toBe("en");
        expect(moment.locale()).toBe("en");
        expect(moment().format("MMM")).toBe(moment().locale("en").format("MMM"));
    });
});

describe("weekdayNames: 週の始まりから並べた、その言語の曜日の名前", () => {
    it("月曜始まりの日本語", () => {
        expect(weekdayNames("ja", 1).weekdaysShort).toEqual(["月", "火", "水", "木", "金", "土", "日"]);
        expect(weekdayNames("ja", 1).weekdays[0]).toBe("月曜日");
    });

    it("日曜始まりの英語", () => {
        expect(weekdayNames("en", 0).weekdaysShort).toEqual(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);
    });

    it("土曜始まり", () => {
        expect(weekdayNames("en", 6).weekdays[0]).toBe("Saturday");
        expect(weekdayNames("en", 6).weekdays[6]).toBe("Friday");
    });

    it("Obsidian 全体の moment の言語は変えない", () => {
        weekdayNames("ja", 1);
        expect(moment.locale()).toBe("en");
    });

    it("moment が知らない言語なら、英語の名前", () => {
        expect(weekdayNames("xx-unknown", 0).weekdaysShort[0]).toBe("Su");
    });
});

describe("weekdayHeader: カレンダーの曜日の見出しは、表の列と同じ日から書く", () => {
    it("月曜始まりの表なら、月曜から並ぶ", () => {
        const grid = monthGrid(d("2026-10-15"), createIsoWeekScheme(1));
        expect(weekdayHeader(grid[0].days, "ja")).toEqual(["月", "火", "水", "木", "金", "土", "日"]);
    });

    it("土曜始まりの表なら、土曜から並ぶ", () => {
        const grid = monthGrid(d("2026-10-15"), createIsoWeekScheme(6));
        expect(weekdayHeader(grid[0].days, "en")).toEqual(["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"]);
    });

    it("Obsidian 全体の moment の言語も、表の日付の言語も変えない", () => {
        const grid = monthGrid(d("2026-10-15"), createIsoWeekScheme(0));
        weekdayHeader(grid[0].days, "ja");
        expect(moment.locale()).toBe("en");
        expect(grid[0].days[0].locale()).toBe("en");
    });
});

describe("obsidianMomentLocale: Obsidian の言語を、moment の言語の名前にする（カレンダーの言語の既定）", () => {
    // Obsidian 1.14.5 と同じ読み替え: 小文字にし、zh・cz・no だけ名前を変える。moment にない言語は英語
    const known = ["en", "ja", "zh-cn", "zh-tw", "pt-br", "cs", "nb", "de"];

    it("そのまま moment にある言語", () => {
        expect(obsidianMomentLocale("ja", known)).toBe("ja");
        expect(obsidianMomentLocale("de", known)).toBe("de");
        expect(obsidianMomentLocale("en", known)).toBe("en");
    });

    it("地域付きは小文字にする", () => {
        expect(obsidianMomentLocale("zh-TW", known)).toBe("zh-tw");
        expect(obsidianMomentLocale("pt-BR", known)).toBe("pt-br");
    });

    it("Obsidian が名前を読み替える言語", () => {
        expect(obsidianMomentLocale("zh", known)).toBe("zh-cn");
        expect(obsidianMomentLocale("cz", known)).toBe("cs");
        expect(obsidianMomentLocale("no", known)).toBe("nb");
    });

    it("moment にない言語は英語", () => {
        expect(obsidianMomentLocale("xx", known)).toBe("en");
    });
});

describe("localeWeekStart: その言語のふつうの週の始まり（0 = 日曜）", () => {
    it("言語ごとに決まっている週の始まりを返す", () => {
        expect(localeWeekStart("en")).toBe(0);
        expect(localeWeekStart("ja")).toBe(0);
        expect(localeWeekStart("en-gb")).toBe(1);
    });
});

describe("monthGrid: カレンダーに並べる 6 週・42 日", () => {
    it("月の 1 日を含む週の始まりから、42 日を 7 日ずつ並べる", () => {
        const grid = monthGrid(d("2026-10-15"), createIsoWeekScheme(1)); // 2026-10-01 is a Thursday
        expect(grid).toHaveLength(6);
        expect(grid.every((week) => week.days.length === 7)).toBe(true);
        expect(ymd(grid[0].days[0])).toBe("2026-09-28");
        expect(ymd(grid[5].days[6])).toBe("2026-11-08");
    });

    it("週の始まりに合わせて、最初の日がずれる", () => {
        expect(ymd(monthGrid(d("2026-10-15"), createIsoWeekScheme(0))[0].days[0])).toBe("2026-09-27");
        expect(ymd(monthGrid(d("2026-10-15"), createIsoWeekScheme(6))[0].days[0])).toBe("2026-09-26");
    });

    it("1 日が週の始まりの日なら、1 日から並べる", () => {
        // 2026-11-01 is a Sunday
        expect(ymd(monthGrid(d("2026-11-20"), createIsoWeekScheme(0))[0].days[0])).toBe("2026-11-01");
        expect(ymd(monthGrid(d("2026-11-20"), createIsoWeekScheme(1))[0].days[0])).toBe("2026-10-26");
    });

    it("1 日が週の始まりの曜日なら、1 日から始まる", () => {
        expect(ymd(monthGrid(d("2026-06-20"), createIsoWeekScheme(1))[0].days[0])).toBe("2026-06-01"); // a Monday
    });

    it("日付の言語に関係なく同じ（曜日の名前で探さない）", () => {
        const ja = monthGrid(d("2026-10-15").locale("ja"), createIsoWeekScheme(1));
        expect(ymd(ja[0].days[0])).toBe("2026-09-28");
    });
});
