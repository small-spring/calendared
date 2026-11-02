import { describe, expect, it } from "vitest";
import { DrawnValue } from "./drawn-value";

describe("DrawnValue: 描いたときの値と今の値を比べる", () => {
    it("まだ描いていなければ、変わったとは言わない", () => {
        const value = new DrawnValue(() => "warning");
        expect(value.changed()).toBe(false);
    });

    it("描いたときと同じなら変わっていない", () => {
        let current: "warning" | null = null;
        const value = new DrawnValue(() => current);
        expect(value.draw()).toBeNull();
        expect(value.changed()).toBe(false);
    });

    it("印が付く・消えるときは変わった", () => {
        let current: "warning" | null = null;
        const value = new DrawnValue(() => current);
        value.draw();
        current = "warning";
        expect(value.changed()).toBe(true);
        value.draw();
        expect(value.changed()).toBe(false);
        current = null;
        expect(value.changed()).toBe(true);
    });
});
