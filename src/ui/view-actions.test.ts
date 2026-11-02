import { describe, expect, it } from "vitest";
import { actionPlacement } from "./view-actions";

// Obsidian's addAction puts each new button at the left end, so the order would depend on which was added last


describe("actionPlacement: ヘッダーに足したボタンを、すでにあるプラグインのボタンのどこに置くか", () => {
    it("ほかになければ動かさない", () => {
        expect(actionPlacement("sticker", [])).toBeNull();
        expect(actionPlacement("open-now", [])).toBeNull();
    });

    it("Open now はステッカーの右に置く", () => {
        expect(actionPlacement("open-now", ["sticker"])).toEqual({ after: 0 });
    });

    it("ステッカーは Open now の左に置く", () => {
        expect(actionPlacement("sticker", ["open-now"])).toEqual({ before: 0 });
    });
});
