import { describe, expect, it } from "vitest";
import { FORMATS } from "@/test-fixtures";
import { NO_MIGRATION_NOTICES, noticesOnPage, trackSettingChanges } from "./migration-notice";

type Formats = Partial<Record<keyof typeof FORMATS, string>>;
const at = (formats: Formats, stickerProperty = "sticker") => ({
    periods: {
        day: { format: formats.day ?? FORMATS.day },
        week: { format: formats.week ?? FORMATS.week },
        month: { format: formats.month ?? FORMATS.month },
        quarter: { format: formats.quarter ?? FORMATS.quarter },
        year: { format: formats.year ?? FORMATS.year },
    },
    stickerProperty,
});

describe("trackSettingChanges: 移行の案内のために、変える前の書式（プロパティ）を覚える（ADR-0035）", () => {
    it("書式を変えたら、その周期の変える前の書式を覚える", () => {
        expect(trackSettingChanges(NO_MIGRATION_NOTICES, at({}), at({ day: "YYYYMMDD" }))).toEqual({
            formats: { day: "YYYY-MM-DD" },
            stickerProperty: null,
        });
    });

    it("案内が出ている間にもう一度変えたら、いちばん前の書式を覚えたままにする（入力の途中で保存されたときも）", () => {
        const first = trackSettingChanges(NO_MIGRATION_NOTICES, at({}), at({ day: "YYYYMMD" }));
        expect(trackSettingChanges(first, at({ day: "YYYYMMD" }), at({ day: "YYYYMMDD" })).formats).toEqual({ day: "YYYY-MM-DD" });
    });

    it("変えた先がいちばん前の書式と同じなら、案内ごと忘れる", () => {
        const notices = { formats: { day: "YYYY-MM-DD" }, stickerProperty: null };
        expect(trackSettingChanges(notices, at({ day: "YYYYMMDD" }), at({})).formats).toEqual({});
    });

    it("前後の空白だけの違いは、変えたとみなさない", () => {
        expect(trackSettingChanges(NO_MIGRATION_NOTICES, at({}), at({ day: "YYYY-MM-DD " }))).toEqual(NO_MIGRATION_NOTICES);
    });

    it("ほかの周期の覚えた書式はそのまま", () => {
        const notices = { formats: { week: "gggg-[W]ww" }, stickerProperty: null };
        expect(trackSettingChanges(notices, at({}), at({ day: "YYYYMMDD" })).formats).toEqual({ week: "gggg-[W]ww", day: "YYYY-MM-DD" });
    });

    it("ステッカーのプロパティも同じように覚え、元に戻したら忘れる", () => {
        const changed = trackSettingChanges(NO_MIGRATION_NOTICES, at({}), at({}, "mood"));
        expect(changed.stickerProperty).toBe("sticker");
        const again = trackSettingChanges(changed, at({}, "mood"), at({}, "feeling"));
        expect(again.stickerProperty).toBe("sticker");
        expect(trackSettingChanges(again, at({}, "feeling"), at({})).stickerProperty).toBeNull();
    });

    it("何も変わらなければ、同じものを返す（設定の保存を繰り返さないように）", () => {
        const notices = { formats: { day: "YYYYMMDD" }, stickerProperty: null };
        expect(trackSettingChanges(notices, at({}), at({}))).toBe(notices);
    });
});

describe("noticesOnPage: Migrate notes のページに行が出ている案内だけを選ぶ", () => {
    const notices = { formats: { day: "YYYYMMDD", month: "YYYYMM" }, stickerProperty: "mood" };
    const enabled = (on: boolean) => ({ enabled: on });
    const periods = { day: enabled(true), week: enabled(true), month: enabled(false), quarter: enabled(false), year: enabled(true) };

    it("オフの周期の案内は選ばない（その周期の行が出ないので）", () => {
        expect(noticesOnPage({ periods, stickersEnabled: true, migrationNotices: notices })).toEqual({
            formats: { day: "YYYYMMDD" },
            stickerProperty: "mood",
        });
    });

    it("ステッカーがオフなら、プロパティの案内は選ばない", () => {
        expect(noticesOnPage({ periods, stickersEnabled: false, migrationNotices: notices }).stickerProperty).toBeNull();
    });
});
