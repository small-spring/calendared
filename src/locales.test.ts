import { describe, expect, it } from "vitest";
import locales from "./locales";

// The names in the "Calendar language" setting's choices
describe("locales: カレンダーの言語の選択肢に出す名前", () => {
    it("名前の前後に空白がない", () => {
        for (const name of locales.values()) expect(name).toBe(name.trim());
    });

    it("同じ名前の言語が 2 つない（選択肢で見分けられる）", () => {
        const names = [...locales.values()];
        expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([]);
    });

    it("国の名前のつづり", () => {
        expect(locales.get("ar-ly")).toBe("Arabic (Libya)");
    });
});
