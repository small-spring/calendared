import moment from "moment";
import "moment/locale/fa";
import "moment/locale/ja";
import "moment/locale/oc-lnc";
import "moment/locale/tlh";
import "moment/locale/x-pseudo";
import { describe, expect, it } from "vitest";
import {
    breadcrumbs,
    crumbText,
    finestEnabled,
    isNowNote,
    monthDayText,
    migratePlacementSettings,
    migrateTimelineSettings,
    barShows,
    dayLayoutPreview,
    showsOn,
    stripDates,
    type Placement,
} from "./navigation";
import { periodRules } from "./periods";
import { createIsoWeekScheme } from "./weeks";
import { d, mondayWeeks, sundayWeeks, ymd } from "@/test-fixtures";

// loading a locale switches moment to it; go back to English like test-setup.ts does
moment.locale("en");

const ymds = (dates: moment.Moment[]) => dates.map(ymd);
const ALL = { day: true, week: true, month: true, quarter: true, year: true };

// ---- 設定の読み替え（docs/adr/0031） ----

describe("migrateTimelineSettings: 今のタイムラインの設定を、パンくずとミニカレンダーの設定に読み替える", () => {
    it("保存された設定に timeline がなければ、何もしない（初めて入れたとき、読み替え済み）", () => {
        expect(migrateTimelineSettings({ stickerProperty: "sticker" })).toEqual({ stickerProperty: "sticker" });
    });

    it("オンだったタイムラインは、どちらもオンで「いつも」。ほかのノートに出すか、ステッカーを出すかは引き継ぐ", () => {
        const saved = {
            timeline: {
                enabled: true,
                granularityBased: false,
                displayOnRestNotes: false,
                displayStickers: false,
                viewMode: "collapsed",
                restViewMode: "collapsed",
            },
        };
        expect(migrateTimelineSettings(saved)).toEqual({
            breadcrumbs: { enabled: true, placement: "always", onOtherNotes: false },
            miniCalendar: { enabled: true, placement: "always", onOtherNotes: false, dayLayout: "week", displayStickers: false },
        });
    });

    it("オフだったタイムラインは、どちらもオフ（出す場所は「いつも」のまま）", () => {
        const migrated = migrateTimelineSettings({ timeline: { enabled: false, displayOnRestNotes: true, displayStickers: true } });
        expect(migrated.breadcrumbs).toEqual({ enabled: false, placement: "always", onOtherNotes: true });
        expect(migrated.miniCalendar).toEqual({
            enabled: false,
            placement: "always",
            onOtherNotes: true,
            dayLayout: "week",
            displayStickers: true,
        });
    });

    it("timeline は消し、ほかの設定には触れない", () => {
        const migrated = migrateTimelineSettings({ timeline: { enabled: true }, compactOnDesktop: true });
        expect(migrated).not.toHaveProperty("timeline");
        expect(migrated.compactOnDesktop).toBe(true);
    });

    it("項目が欠けていたら、既定値（オン、いつも、ほかのノートにも出す、ステッカーを出す）にする", () => {
        expect(migrateTimelineSettings({ timeline: {} })).toEqual({
            breadcrumbs: { enabled: true, placement: "always", onOtherNotes: true },
            miniCalendar: { enabled: true, placement: "always", onOtherNotes: true, dayLayout: "week", displayStickers: true },
        });
    });

    it("新しい設定がもうあれば、そちらを残す（timeline だけ消す）", () => {
        const breadcrumbs = { enabled: true, placement: "phone", onOtherNotes: false };
        expect(migrateTimelineSettings({ timeline: { enabled: false }, breadcrumbs })).toEqual({ breadcrumbs });
    });
});

describe("migratePlacementSettings: 出す場所の 3 択（Never を含む）を、オン・オフと 2 択に読み替える", () => {
    it("Never はオフにし、出す場所は「いつも」にする", () => {
        const saved = {
            breadcrumbs: { placement: "never", onOtherNotes: false },
            miniCalendar: { placement: "never", onOtherNotes: true, dayLayout: "centered", displayStickers: false },
        };
        expect(migratePlacementSettings(saved)).toEqual({
            breadcrumbs: { enabled: false, placement: "always", onOtherNotes: false },
            miniCalendar: { enabled: false, placement: "always", onOtherNotes: true, dayLayout: "centered", displayStickers: false },
        });
    });

    it("Always と Phone only はオンにして、出す場所はそのまま", () => {
        const migrated = migratePlacementSettings({
            breadcrumbs: { placement: "phone", onOtherNotes: true },
            miniCalendar: { placement: "always", onOtherNotes: true, dayLayout: "week", displayStickers: true },
        });
        expect(migrated.breadcrumbs).toEqual({ enabled: true, placement: "phone", onOtherNotes: true });
        expect(migrated.miniCalendar).toMatchObject({ enabled: true, placement: "always" });
    });

    it("オン・オフがもう保存されていれば、何もしない", () => {
        const saved = { breadcrumbs: { enabled: false, placement: "phone", onOtherNotes: true }, compactOnDesktop: true };
        expect(migratePlacementSettings(saved)).toEqual(saved);
    });

    it("どちらの設定もなければ、何もしない（初めて入れたとき）", () => {
        expect(migratePlacementSettings({ stickerProperty: "sticker" })).toEqual({ stickerProperty: "sticker" });
    });
});

// ---- 出す場所 ----

describe("showsOn: オン・オフと出す場所の設定、スマホかどうかから、出すかを決める", () => {
    const cases: [boolean, Placement, boolean, boolean][] = [
        [true, "always", true, true],
        [true, "always", false, true],
        [true, "phone", true, true],
        [true, "phone", false, false],
        [false, "always", true, false],
        [false, "always", false, false],
        [false, "phone", true, false],
    ];
    it.each(cases)("オン %s・%s・スマホ %s → %s", (enabled, placement, isPhone, expected) => {
        expect(showsOn({ enabled, placement }, isPhone)).toBe(expected);
    });
});

describe("finestEnabled: 使っている周期のうち一番細かいもの（周期ノートでないノートの基準）", () => {
    it("日を使っていれば日", () => {
        expect(finestEnabled(ALL)).toBe("day");
    });
    it("日を使っていなければ、次に細かいもの", () => {
        expect(finestEnabled({ ...ALL, day: false, week: false })).toBe("month");
    });
    it("どれも使っていなければ日", () => {
        expect(finestEnabled({ day: false, week: false, month: false, quarter: false, year: false })).toBe("day");
    });
});

// ---- ミニカレンダーに並べるもの ----

describe("stripDates: ミニカレンダーに並べる期間（それぞれの始まりの日）", () => {
    it("日・週ごと: カレンダーと同じ週の 7 日（週の始まりは週の決め方から）", () => {
        expect(ymds(stripDates("day", d("2026-10-30"), 0, "week", mondayWeeks))).toEqual([
            "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01",
        ]);
        expect(stripDates("day", d("2026-10-30"), 0, "week", sundayWeeks)[0].format("YYYY-MM-DD")).toBe("2026-10-25");
    });

    it("日・ノートを真ん中に: 前後 3 日ずつ", () => {
        expect(ymds(stripDates("day", d("2026-10-30"), 0, "centered", mondayWeeks))).toEqual([
            "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02",
        ]);
    });

    it("日: ‹ › は 7 日ずつ動く", () => {
        expect(ymds(stripDates("day", d("2026-10-30"), -1, "week", mondayWeeks))[0]).toBe("2026-10-19");
        expect(ymds(stripDates("day", d("2026-10-30"), 1, "centered", mondayWeeks))[3]).toBe("2026-11-06");
    });

    it("週: ノートを真ん中に前後 2 つずつ。始まりは週の決め方の行の最初の日", () => {
        expect(ymds(stripDates("week", d("2026-10-26"), 0, "week", mondayWeeks))).toEqual([
            "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09",
        ]);
        expect(ymds(stripDates("week", d("2026-10-28"), 0, "week", sundayWeeks))[2]).toBe("2026-10-25");
    });

    it("月・四半期・年: ノートを真ん中に前後 2 つずつ。‹ › は 5 つずつ動く（日の並べ方は効かない）", () => {
        expect(ymds(stripDates("month", d("2026-10-01"), 0, "week", mondayWeeks))).toEqual([
            "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01",
        ]);
        expect(ymds(stripDates("quarter", d("2026-10-01"), 0, "centered", mondayWeeks))).toEqual([
            "2026-04-01", "2026-07-01", "2026-10-01", "2027-01-01", "2027-04-01",
        ]);
        expect(ymds(stripDates("year", d("2026-01-01"), 1, "week", mondayWeeks))).toEqual([
            "2029-01-01", "2030-01-01", "2031-01-01", "2032-01-01", "2033-01-01",
        ]);
    });

    it("期間の途中の日を渡しても、期間の始まりに揃える", () => {
        expect(ymds(stripDates("month", d("2026-10-30"), 0, "week", mondayWeeks))[2]).toBe("2026-10-01");
    });
});

describe("dayLayoutPreview: 設定画面で「Days shown」の値ごとに見せる、今日の日のノートのミニカレンダー", () => {
    const days = (cells: { day: string }[]) => cells.map((c) => c.day);

    it("Calendar week: 今日を含む週の 7 日。曜日（ミニカレンダーと同じ書き方）つきで、今日に印", () => {
        const cells = dayLayoutPreview(d("2026-11-04"), "week", mondayWeeks, "en");
        expect(days(cells)).toEqual(["2", "3", "4", "5", "6", "7", "8"]);
        expect(cells.map((c) => c.weekday)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
        expect(cells.map((c) => c.isToday)).toEqual([false, false, true, false, false, false, false]);
    });

    it("Calendar week: 週の始まりの設定に従う", () => {
        expect(days(dayLayoutPreview(d("2026-11-04"), "week", sundayWeeks, "en"))).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    });

    it("3 days each side: 今日が真ん中", () => {
        const cells = dayLayoutPreview(d("2026-11-04"), "centered", mondayWeeks, "en");
        expect(days(cells)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
        expect(cells[3].isToday).toBe(true);
    });

    it("曜日はカレンダーの言語で書く", () => {
        expect(dayLayoutPreview(d("2026-11-04"), "week", mondayWeeks, "ja")[0].weekday).toBe("月");
    });
});

// ---- パンくず ----

const crumbs = (...args: Parameters<typeof breadcrumbs>) =>
    breadcrumbs(...args).map((c) => `${c.granularity}:${c.date.format("YYYY-MM-DD")}${c.canOpen ? "" : "(x)"}`);

describe("breadcrumbs: 開いているノートの位置を、上の周期から並べる", () => {
    it("日: 年・四半期・月・週・日", () => {
        expect(crumbs("day", d("2026-10-30"), ALL, mondayWeeks)).toEqual([
            "year:2026-01-01", "quarter:2026-10-01", "month:2026-10-01", "week:2026-10-26", "day:2026-10-30",
        ]);
    });

    it("月: 年・四半期・月（週は出さない）", () => {
        expect(crumbs("month", d("2026-10-01"), ALL, mondayWeeks)).toEqual([
            "year:2026-01-01", "quarter:2026-10-01", "month:2026-10-01",
        ]);
    });

    it("週: 年・四半期・月は、その週の木曜日のもの（月をまたぐ週）", () => {
        // 2026-W40 は 9/28（月）〜10/4（日）。木曜日は 10/1
        expect(crumbs("week", d("2026-09-28"), ALL, mondayWeeks)).toEqual([
            "year:2026-01-01", "quarter:2026-10-01", "month:2026-10-01", "week:2026-09-28",
        ]);
    });

    it("週: 年をまたぐ週は、週番号の年と揃う", () => {
        // 2025-12-29（月）の週は 2026-W01。木曜日は 2026-01-01
        expect(crumbs("week", d("2025-12-29"), ALL, mondayWeeks)).toEqual([
            "year:2026-01-01", "quarter:2026-01-01", "month:2026-01-01", "week:2025-12-29",
        ]);
    });

    it("週: 日曜始まりの行でも、木曜日はその行の月曜日の 3 日後", () => {
        // 日曜始まりの 2025-12-28〜2026-01-03 の行は、月曜日 12/29 の 2026-W01
        expect(crumbs("week", d("2025-12-28"), ALL, sundayWeeks)[0]).toBe("year:2026-01-01");
        expect(crumbs("week", d("2025-12-28"), ALL, sundayWeeks)[3]).toBe("week:2025-12-28");
    });

    it("週: 日・土曜始まりで、行の真ん中と木曜日の月が違っても、木曜日の月になる", () => {
        // 2024-02-01 は木曜日。日曜始まりの行 1/28〜2/3 の真ん中（水曜日）は 1/31、土曜始まりの行 1/27〜2/2 の真ん中は 1/30
        const saturdayWeeks = periodRules(createIsoWeekScheme(6));
        expect(crumbs("week", d("2024-01-28"), ALL, sundayWeeks)[2]).toBe("month:2024-02-01");
        expect(crumbs("week", d("2024-01-27"), ALL, saturdayWeeks)[2]).toBe("month:2024-02-01");
    });

    it("日: 週のパンくずは、日を含む行（週の始まりは週の決め方から）", () => {
        expect(crumbs("day", d("2026-11-01"), ALL, sundayWeeks)[3]).toBe("week:2026-11-01");
        expect(crumbs("day", d("2026-11-01"), ALL, mondayWeeks)[3]).toBe("week:2026-10-26");
    });

    it("使っていない週・四半期は出さない", () => {
        expect(crumbs("day", d("2026-10-30"), { ...ALL, week: false, quarter: false }, mondayWeeks)).toEqual([
            "year:2026-01-01", "month:2026-10-01", "day:2026-10-30",
        ]);
    });

    it("使っていない月・年は、出すが押せない", () => {
        expect(crumbs("day", d("2026-10-30"), { ...ALL, month: false, year: false }, mondayWeeks)).toEqual([
            "year:2026-01-01(x)", "quarter:2026-10-01", "month:2026-10-01(x)", "week:2026-10-26", "day:2026-10-30",
        ]);
    });

    it("一番右（そのノート自身）は、その周期を使っていなくても出す", () => {
        const all = crumbs("week", d("2026-10-26"), { ...ALL, week: false }, mondayWeeks);
        expect(all[all.length - 1]).toBe("week:2026-10-26");
    });
});

describe("crumbText: パンくずの文字（カレンダーの言語）", () => {
    it("日本語: 2026 / Q4 / 10月 / W44 / 30日", () => {
        expect(crumbText("year", d("2026-01-01"), "ja", mondayWeeks)).toBe("2026");
        expect(crumbText("quarter", d("2026-10-01"), "ja", mondayWeeks)).toBe("Q4");
        expect(crumbText("month", d("2026-10-01"), "ja", mondayWeeks)).toBe("10月");
        expect(crumbText("week", d("2026-10-26"), "ja", mondayWeeks)).toBe("W44");
        expect(crumbText("day", d("2026-10-30"), "ja", mondayWeeks)).toBe("30日");
    });

    it("英語: 月は短い名前、日はその言語の日の書き方（moment の Do）", () => {
        expect(crumbText("month", d("2026-10-01"), "en", mondayWeeks)).toBe("Oct");
        expect(crumbText("day", d("2026-10-30"), "en", mondayWeeks)).toBe("30th");
    });

    it("月・日は、カレンダー本体と同じ moment の言語データで書く（Intl が知らない言語でも止まらない）", () => {
        expect(crumbText("month", d("2026-10-01"), "x-pseudo", mondayWeeks)).toBe("~Óct");
        expect(crumbText("day", d("2026-10-30"), "x-pseudo", mondayWeeks)).toBe("30th");
        expect(crumbText("month", d("2026-10-01"), "oc-lnc", mondayWeeks)).toBe("oct.");
        expect(crumbText("month", d("2026-10-01"), "tlh", mondayWeeks)).toBe("jar wa’maH");
        // Intl writes Persian with the Persian calendar (2026-10-30 is "آبان ۸"); the calendar is Gregorian
        expect(crumbText("month", d("2026-10-01"), "fa", mondayWeeks)).toBe("اکتبر");
    });

    it("ミニカレンダーの戻るボタン: 月と日", () => {
        expect(monthDayText(d("2026-10-30"), "ja")).toBe("10月 30日");
        expect(monthDayText(d("2026-10-30"), "en")).toBe("Oct 30th");
    });

    it("週番号は週の決め方から、2 桁にする", () => {
        expect(crumbText("week", d("2026-01-05"), "ja", mondayWeeks)).toBe("W02");
        // 日曜始まりの 2026-10-25 の行は、月曜日 10/26 の W44
        expect(crumbText("week", d("2026-10-25"), "ja", sundayWeeks)).toBe("W44");
    });
});

describe("四半期・年が 1 月以外から始まるとき（docs/adr/0039）", () => {
    const may = { startMonth: 5, yearInName: "start" } as const;
    const mayRules = periodRules(createIsoWeekScheme(1), { quarter: may, year: may });

    it("日: 上の周期は、その日を含む年・四半期", () => {
        expect(crumbs("day", d("2027-03-10"), ALL, mayRules).slice(0, 3)).toEqual([
            "year:2026-05-01", "quarter:2027-02-01", "month:2027-03-01",
        ]);
    });

    it("年をまたぐ四半期は、2 か月目を含む年（年は暦どおり、四半期は 5 月始まり）", () => {
        const rules = periodRules(createIsoWeekScheme(1), { quarter: may });
        // 5 月始まりの四半期 2026-Q3 は 2026-11〜2027-01。2 か月目の 12 月は 2026 年
        expect(crumbs("quarter", d("2026-11-01"), ALL, rules)).toEqual(["year:2026-01-01", "quarter:2026-11-01"]);
        // 3 月始まりなら 2026-12〜2027-02 が 1 つの四半期で、2 か月目は 2027 年
        const feb = periodRules(createIsoWeekScheme(1), { quarter: { startMonth: 3, yearInName: "start" } });
        expect(crumbs("quarter", d("2026-12-01"), ALL, feb)).toEqual(["year:2027-01-01", "quarter:2026-12-01"]);
    });

    it("文字: 年は「2026–27」、四半期はその周期の番号", () => {
        expect(crumbText("year", d("2026-05-01"), "ja", mayRules)).toBe("2026–27");
        expect(crumbText("quarter", d("2027-02-01"), "ja", mayRules)).toBe("Q4");
    });

    it("ミニカレンダー: 四半期・年は、その周期の始まりの日で並ぶ", () => {
        expect(ymds(stripDates("quarter", d("2027-03-10"), 0, "centered", mayRules))).toEqual([
            "2026-08-01", "2026-11-01", "2027-02-01", "2027-05-01", "2027-08-01",
        ]);
    });
});

// ---- Open now（docs/adr/0030） ----

describe("isNowNote: 開いているノートが、一番細かい使っている周期の今のノートか（Open now を薄くする）", () => {
    const today = d("2026-10-30");
    it("日を使っていれば、今日のデイリーノートだけ", () => {
        expect(isNowNote({ granularity: "day", date: d("2026-10-30") }, ALL, today, mondayWeeks)).toBe(true);
        expect(isNowNote({ granularity: "day", date: d("2026-10-29") }, ALL, today, mondayWeeks)).toBe(false);
        expect(isNowNote({ granularity: "week", date: d("2026-10-26") }, ALL, today, mondayWeeks)).toBe(false);
        // 今日が月曜日でも、日を使っていれば今週の週次ノートは今のノートではない
        expect(isNowNote({ granularity: "week", date: d("2026-10-26") }, ALL, d("2026-10-26"), mondayWeeks)).toBe(false);
    });

    it("日を使っていなければ、今週の週次ノート（週の決め方の行で比べる）", () => {
        const noDays = { ...ALL, day: false };
        expect(isNowNote({ granularity: "week", date: d("2026-10-26") }, noDays, today, mondayWeeks)).toBe(true);
        // 日曜始まりなら、10/25〜10/31 の行
        expect(isNowNote({ granularity: "week", date: d("2026-10-25") }, noDays, today, sundayWeeks)).toBe(true);
        expect(isNowNote({ granularity: "week", date: d("2026-10-19") }, noDays, today, mondayWeeks)).toBe(false);
    });

    it("周期ノートでないノート（null）は、今のノートではない", () => {
        expect(isNowNote(null, ALL, today, mondayWeeks)).toBe(false);
    });
});

describe("barShows: ノートの上に、パンくずとミニカレンダーを出すか", () => {
    const feature = (enabled: boolean, placement: Placement, onOtherNotes: boolean) => ({ enabled, placement, onOtherNotes });

    it("周期ノートなら、出す場所の設定どおり", () => {
        const settings = { breadcrumbs: feature(true, "always", false), miniCalendar: feature(true, "phone", false) };
        expect(barShows(settings, false, true)).toEqual({ crumbs: true, mini: false });
        expect(barShows(settings, true, true)).toEqual({ crumbs: true, mini: true });
    });

    it("周期ノートでなければ、「ほかのノートにも出す」がオンのものだけ", () => {
        const settings = { breadcrumbs: feature(true, "always", true), miniCalendar: feature(true, "always", false) };
        expect(barShows(settings, false, false)).toEqual({ crumbs: true, mini: false });
    });

    it("オフなら、ほかのノートにも出さない", () => {
        const settings = { breadcrumbs: feature(false, "always", true), miniCalendar: feature(true, "phone", true) };
        expect(barShows(settings, false, false)).toEqual({ crumbs: false, mini: false });
    });
});
