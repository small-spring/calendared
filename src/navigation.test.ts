import moment from "moment";
import { describe, expect, it } from "vitest";
import {
    breadcrumbs,
    crumbText,
    finestEnabled,
    isNowNote,
    migrateTimelineSettings,
    showsOn,
    stripDates,
    type Placement,
} from "./navigation";
import { createIsoWeekScheme } from "./weeks";

const d = (s: string) => moment(s, "YYYY-MM-DD");
const ymd = (dates: moment.Moment[]) => dates.map((x) => x.format("YYYY-MM-DD"));
const mondayWeeks = createIsoWeekScheme(1);
const sundayWeeks = createIsoWeekScheme(0);
const ALL = { day: true, week: true, month: true, quarter: true, year: true };

// ---- 設定の読み替え（docs/adr/0031） ----

describe("migrateTimelineSettings: 今のタイムラインの設定を、パンくずとミニカレンダーの設定に読み替える", () => {
    it("保存された設定に timeline がなければ、何もしない（初めて入れたとき、読み替え済み）", () => {
        expect(migrateTimelineSettings({ stickerProperty: "sticker" })).toEqual({ stickerProperty: "sticker" });
    });

    it("オンだったタイムラインは、どちらも「いつも」。ほかのノートに出すか、ステッカーを出すかは引き継ぐ", () => {
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
            breadcrumbs: { placement: "always", onOtherNotes: false },
            miniCalendar: { placement: "always", onOtherNotes: false, dayLayout: "week", displayStickers: false },
        });
    });

    it("オフだったタイムラインは、どちらも「出さない」", () => {
        const migrated = migrateTimelineSettings({ timeline: { enabled: false, displayOnRestNotes: true, displayStickers: true } });
        expect(migrated.breadcrumbs).toEqual({ placement: "never", onOtherNotes: true });
        expect(migrated.miniCalendar).toEqual({ placement: "never", onOtherNotes: true, dayLayout: "week", displayStickers: true });
    });

    it("timeline は消し、ほかの設定には触れない", () => {
        const migrated = migrateTimelineSettings({ timeline: { enabled: true }, compactOnDesktop: true });
        expect(migrated).not.toHaveProperty("timeline");
        expect(migrated.compactOnDesktop).toBe(true);
    });

    it("項目が欠けていたら、既定値（いつも、ほかのノートにも出す、ステッカーを出す）にする", () => {
        expect(migrateTimelineSettings({ timeline: {} })).toEqual({
            breadcrumbs: { placement: "always", onOtherNotes: true },
            miniCalendar: { placement: "always", onOtherNotes: true, dayLayout: "week", displayStickers: true },
        });
    });

    it("新しい設定がもうあれば、そちらを残す（timeline だけ消す）", () => {
        const breadcrumbs = { placement: "phone", onOtherNotes: false };
        expect(migrateTimelineSettings({ timeline: { enabled: false }, breadcrumbs })).toEqual({ breadcrumbs });
    });
});

// ---- 出す場所 ----

describe("showsOn: 出す場所の設定と、スマホかどうかから、出すかを決める", () => {
    const cases: [Placement, boolean, boolean][] = [
        ["always", true, true],
        ["always", false, true],
        ["phone", true, true],
        ["phone", false, false],
        ["never", true, false],
        ["never", false, false],
    ];
    it.each(cases)("%s・スマホ %s → %s", (placement, isPhone, expected) => {
        expect(showsOn(placement, isPhone)).toBe(expected);
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
        expect(ymd(stripDates("day", d("2026-10-30"), 0, "week", mondayWeeks))).toEqual([
            "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01",
        ]);
        expect(stripDates("day", d("2026-10-30"), 0, "week", sundayWeeks)[0].format("YYYY-MM-DD")).toBe("2026-10-25");
    });

    it("日・ノートを真ん中に: 前後 3 日ずつ", () => {
        expect(ymd(stripDates("day", d("2026-10-30"), 0, "centered", mondayWeeks))).toEqual([
            "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02",
        ]);
    });

    it("日: ‹ › は 7 日ずつ動く", () => {
        expect(ymd(stripDates("day", d("2026-10-30"), -1, "week", mondayWeeks))[0]).toBe("2026-10-19");
        expect(ymd(stripDates("day", d("2026-10-30"), 1, "centered", mondayWeeks))[3]).toBe("2026-11-06");
    });

    it("週: ノートを真ん中に前後 2 つずつ。始まりは週の決め方の行の最初の日", () => {
        expect(ymd(stripDates("week", d("2026-10-26"), 0, "week", mondayWeeks))).toEqual([
            "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09",
        ]);
        expect(ymd(stripDates("week", d("2026-10-28"), 0, "week", sundayWeeks))[2]).toBe("2026-10-25");
    });

    it("月・四半期・年: ノートを真ん中に前後 2 つずつ。‹ › は 5 つずつ動く（日の並べ方は効かない）", () => {
        expect(ymd(stripDates("month", d("2026-10-01"), 0, "week", mondayWeeks))).toEqual([
            "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01",
        ]);
        expect(ymd(stripDates("quarter", d("2026-10-01"), 0, "centered", mondayWeeks))).toEqual([
            "2026-04-01", "2026-07-01", "2026-10-01", "2027-01-01", "2027-04-01",
        ]);
        expect(ymd(stripDates("year", d("2026-01-01"), 1, "week", mondayWeeks))).toEqual([
            "2029-01-01", "2030-01-01", "2031-01-01", "2032-01-01", "2033-01-01",
        ]);
    });

    it("期間の途中の日を渡しても、期間の始まりに揃える", () => {
        expect(ymd(stripDates("month", d("2026-10-30"), 0, "week", mondayWeeks))[2]).toBe("2026-10-01");
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

    it("英語: 月は短い名前、日は数字だけ", () => {
        expect(crumbText("month", d("2026-10-01"), "en", mondayWeeks)).toBe("Oct");
        expect(crumbText("day", d("2026-10-30"), "en", mondayWeeks)).toBe("30");
    });

    it("週番号は週の決め方から、2 桁にする", () => {
        expect(crumbText("week", d("2026-01-05"), "ja", mondayWeeks)).toBe("W02");
        // 日曜始まりの 2026-10-25 の行は、月曜日 10/26 の W44
        expect(crumbText("week", d("2026-10-25"), "ja", sundayWeeks)).toBe("W44");
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
