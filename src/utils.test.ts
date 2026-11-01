import { describe, expect, it } from "vitest";
import { countOf } from "./utils";

describe("countOf: 数と、1 つでなければ複数形にした名前", () => {
    it("1 なら単数、それ以外は s を付ける", () => {
        expect(countOf(1, "note")).toBe("1 note");
        expect(countOf(0, "note")).toBe("0 notes");
        expect(countOf(3, "sticker")).toBe("3 stickers");
    });
});
