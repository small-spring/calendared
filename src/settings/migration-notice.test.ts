import { describe, expect, it } from "vitest";
import { NO_MIGRATION_NOTICES, trackSettingChanges } from "./migration-notice";

type Formats = Partial<Record<"day" | "week" | "month" | "quarter" | "year", string>>;
const at = (formats: Formats, stickerProperty = "sticker") => ({
    periods: {
        day: { format: formats.day ?? "YYYY-MM-DD" },
        week: { format: formats.week ?? "GGGG-[W]WW" },
        month: { format: formats.month ?? "YYYY-MM" },
        quarter: { format: formats.quarter ?? "YYYY-[Q]Q" },
        year: { format: formats.year ?? "YYYY" },
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
