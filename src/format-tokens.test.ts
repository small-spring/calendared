import { describe, expect, it } from "vitest";
import { disallowedTokens, formatTokenGuide, missingTokens, tokenize } from "./format-tokens";

// ---- 書式を記号に分ける（docs/adr/0041） ----

describe("tokenize: 書式を記号と文字に分ける", () => {
    it("記号と、[ ] の中や記号でない文字", () => {
        expect(tokenize("YYYY-[Q]Q")).toEqual([
            { kind: "token", token: "YYYY" },
            { kind: "text", text: "-" },
            { kind: "text", text: "Q" },
            { kind: "token", token: "Q" },
        ]);
    });

    it("長い記号を先に取る（MMMM は M 4 つではない）", () => {
        expect(tokenize("MMMM Do").map((p) => (p.kind === "token" ? p.token : p.text))).toEqual(["MMMM", " ", "Do"]);
        expect(tokenize("GGGG-[W]WW").filter((p) => p.kind === "token").map((p) => p.kind === "token" && p.token)).toEqual(["GGGG", "WW"]);
    });

    it("[ ] の中は記号にしない。\\ で 1 文字を文字にできる", () => {
        expect(tokenize("[YYYY年度]")).toEqual([{ kind: "text", text: "YYYY年度" }]);
        expect(tokenize("\\QQ")).toEqual([{ kind: "text", text: "Q" }, { kind: "token", token: "Q" }]);
    });
});

// ---- 名前の書式に使える記号（docs/adr/0040） ----

describe("disallowedTokens: その周期の書式に使えない記号", () => {
    it("既定の書式と、[ ] の文字を使った書式は、どれも使える", () => {
        expect(disallowedTokens("YYYY-MM-DD", "day")).toEqual([]);
        expect(disallowedTokens("GGGG-[W]WW", "week")).toEqual([]);
        expect(disallowedTokens("YYYY年M月", "month")).toEqual([]);
        expect(disallowedTokens("YYYY[年度]-[Q]Q", "quarter")).toEqual([]);
        expect(disallowedTokens("[FY]YY", "year")).toEqual([]);
        expect(disallowedTokens("YYYY-MM-DD ddd", "day")).toEqual([]);
    });

    it("小さい周期の記号は使えない", () => {
        expect(disallowedTokens("GGGG-[W]WW-DD", "week")).toEqual(["DD"]);
        expect(disallowedTokens("GGGG-[W]WW-ddd", "week")).toEqual(["ddd"]);
        expect(disallowedTokens("YYYY-[Q]Q MMM", "quarter")).toEqual(["MMM"]);
        expect(disallowedTokens("YYYY-Q", "year")).toEqual(["Q"]);
        expect(disallowedTokens("YYYY-MM-DD HH:mm".replace(":", ""), "day")).toEqual(["HH", "mm"]);
    });

    it("大きくても、またがる周期の記号は使えない", () => {
        // 週は月・暦の年をまたぐ
        expect(disallowedTokens("GGGG-MM-[W]WW", "week")).toEqual(["MM"]);
        expect(disallowedTokens("YYYY-[W]WW", "week")).toEqual(["YYYY"]);
        // 週の年は年末年始で暦の年とずれる
        expect(disallowedTokens("GGGG", "year")).toEqual(["GGGG"]);
        expect(disallowedTokens("gggg-[Q]Q", "quarter")).toEqual(["gggg"]);
        // 日・月の Q は暦の四半期で、四半期のノートの番号と合わないことがある
        expect(disallowedTokens("YYYY-[Q]Q-MM", "month")).toEqual(["Q"]);
    });

    it("言語の週（gggg・ww）は週の書式に使える（ずれる注意は別に出す）", () => {
        expect(disallowedTokens("gggg-[W]ww", "week")).toEqual([]);
    });

    it("日の書式の週の年と週は、組でだけ使える（ISO の週の日付）", () => {
        expect(disallowedTokens("GGGG-[W]WW-E", "day")).toEqual([]);
        expect(disallowedTokens("GGGG-MM-DD", "day")).toEqual(["GGGG"]);
        expect(disallowedTokens("YYYY-[W]WW-E", "day")).toEqual(["WW"]);
    });

    it("時刻を含まないまとめた書式は、日にだけ使える", () => {
        expect(disallowedTokens("LL", "day")).toEqual([]);
        expect(disallowedTokens("LLL", "day")).toEqual(["LLL"]);
        expect(disallowedTokens("LL", "month")).toEqual(["LL"]);
    });

    it("同じ記号は 1 回だけ挙げる", () => {
        expect(disallowedTokens("YYYY-DD-DD", "month")).toEqual(["DD"]);
    });
});

describe("missingTokens: その周期の名前を 1 つに決めるのに足りない記号", () => {
    it("既定の書式には足りないものがない", () => {
        expect(missingTokens("YYYY-MM-DD", "day")).toBeNull();
        expect(missingTokens("GGGG-[W]WW", "week")).toBeNull();
        expect(missingTokens("YYYY-MM", "month")).toBeNull();
        expect(missingTokens("YYYY-[Q]Q", "quarter")).toBeNull();
        expect(missingTokens("YYYY", "year")).toBeNull();
    });

    it("年がなければ、まず年を挙げる", () => {
        expect(missingTokens("MM", "month")).toBe("year (Y, y, gg or GG)");
        expect(missingTokens("[W]WW", "week")).toBe("year (Y, y, gg or GG)");
    });

    it("周期ごとに要る記号", () => {
        expect(missingTokens("YYYY", "quarter")).toBe("quarter (Q)");
        expect(missingTokens("YYYY", "month")).toBe("month (M)");
        expect(missingTokens("GGGG", "week")).toBe("week (w or W)");
        expect(missingTokens("YYYY-DD", "day")).toBe("month (M)");
        expect(missingTokens("YYYY-MM", "day")).toBe("day (D)");
    });

    it("[ ] の中の文字は数えない", () => {
        expect(missingTokens("YYYY-[Q]", "quarter")).toBe("quarter (Q)");
        expect(missingTokens("[YYYY]-MM", "month")).toBe("year (Y, y, gg or GG)");
        expect(missingTokens("YYYY-MM-[DD]", "day")).toBe("day (D)");
    });

    it("同じ種類の別の記号でもよい", () => {
        expect(missingTokens("YY-MMMM", "month")).toBeNull();
        expect(missingTokens("YYYY-MM-Do", "day")).toBeNull();
        expect(missingTokens("gggg-[W]ww", "week")).toBeNull();
        expect(missingTokens("YYYY-Qo", "quarter")).toBeNull();
    });

    it("時刻を含まないまとめた日付（LL など）は、それだけで日を決める", () => {
        expect(missingTokens("LL", "day")).toBeNull();
        expect(missingTokens("l", "day")).toBeNull();
    });

    it("日は ISO の週の日付（週の年・週・曜日）でも決まる（docs/adr/0040）", () => {
        expect(missingTokens("GGGG-[W]WW-E", "day")).toBeNull();
        expect(missingTokens("GGGG-[W]WW-ddd", "day")).toBeNull();
        expect(missingTokens("GGGG-[W]WW", "day")).toBe("weekday (E)");
    });
});

// ---- 書式の欄の下に出す記号の一覧（docs/adr/0042） ----

describe("formatTokenGuide: 周期ごとの、書式に使う記号と意味の一覧", () => {
    const tokensOf = (items: { token: string }[]) => items.map((i) => i.token);

    it("必ず入れる記号は、日なら年・月・日、週なら週の年と週、月なら年と月、四半期なら年と四半期、年なら年", () => {
        expect(tokensOf(formatTokenGuide("day").required)).toEqual(["YYYY", "MM", "DD"]);
        expect(tokensOf(formatTokenGuide("week").required)).toEqual(["GGGG", "WW"]);
        expect(tokensOf(formatTokenGuide("month").required)).toEqual(["YYYY", "MM"]);
        expect(tokensOf(formatTokenGuide("quarter").required)).toEqual(["YYYY", "Q"]);
        expect(tokensOf(formatTokenGuide("year").required)).toEqual(["YYYY"]);
    });

    it("一覧の記号は、どれもその周期の書式に使える（使える記号の決まりとずれない）", () => {
        for (const g of ["day", "week", "month", "quarter", "year"] as const) {
            const { required, optional } = formatTokenGuide(g);
            const format = tokensOf([...required, ...optional]).join("-");
            expect(disallowedTokens(format, g), g).toEqual([]);
        }
    });

    it("どの記号にも意味が付いている", () => {
        for (const g of ["day", "week", "month", "quarter", "year"] as const) {
            const { required, optional } = formatTokenGuide(g);
            for (const item of [...required, ...optional]) expect(item.meaning, `${g} ${item.token}`).not.toBe("");
        }
    });
});
