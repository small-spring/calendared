import moment from "moment";
import { describe, expect, it, vi } from "vitest";
import { replaceTemplateContents } from "./parse";

// Characterization tests: they pin down how template placeholders behave today, so the code can be reworked safely.
// Where today's behavior looks questionable, the test name says so (see docs/todo.md).

const DEFAULT_FORMAT = "YYYY-MM-DD";
/** a Thursday */
const noteDate = () => moment("2026-10-29", DEFAULT_FORMAT);
const replace = (template: string, date = noteDate()) => replaceTemplateContents(date, DEFAULT_FORMAT, template);

describe("replaceTemplateContents: ノートの日付", () => {
    it("{{date}} と {{title}} はノートの日付を既定の書式で書く", () => {
        expect(replace("{{date}} / {{title}}")).toBe("2026-10-29 / 2026-10-29");
    });

    it("名前の大文字・小文字は区別しない", () => {
        expect(replace("{{DATE}} {{Title}}")).toBe("2026-10-29 2026-10-29");
    });

    it(": のあとに書式を書ける", () => {
        expect(replace("[[{{date:YYYY-MM}}]]")).toBe("[[2026-10]]");
    });

    it("書式は moment の言語に従う（日本語なら曜日は「木」）", () => {
        moment.locale("ja");
        expect(replace("{{date:ddd}}曜日")).toBe("木曜日");
    });

    it("+ / - で日付をずらせる（単位は y Q M w W d h m s）", () => {
        expect(replace("{{date+1d}}")).toBe("2026-10-30");
        expect(replace("{{date-1M:YYYY-MM}}")).toBe("2026-09");
        expect(replace("{{date+1w}}")).toBe("2026-11-05");
    });

    it("1 行に複数あっても、それぞれ置き換える", () => {
        expect(replace("prev [[{{date-1d}}]] | next [[{{date+1d}}]]")).toBe(
            "prev [[2026-10-28]] | next [[2026-10-30]]",
        );
    });
});

describe("replaceTemplateContents: 今の時刻", () => {
    it("{{time}} は今の時刻を HH:mm で書く", () => {
        vi.useFakeTimers({ now: new Date(2026, 10, 2, 9, 5) });
        expect(replace("{{time}}")).toBe("09:05");
    });

    it("{{currentdate}} は今の日時を既定の書式で書く（ノートの日付ではない）", () => {
        vi.useFakeTimers({ now: new Date(2026, 10, 2, 9, 5) });
        expect(replace("{{currentdate}}")).toBe("2026-11-02");
        expect(replace("{{currentdate:HH:mm}}")).toBe("09:05");
    });
});

describe("replaceTemplateContents: 曜日", () => {
    it("{{monday}} などはノートの週のその曜日（英語では日曜はじまりの週）", () => {
        expect(replace("{{sunday}} {{monday}} {{saturday}}")).toBe("2026-10-25 2026-10-26 2026-10-31");
    });

    it("曜日にも足し引きと書式を付けられる", () => {
        expect(replace("{{monday-1w:MM/DD}}")).toBe("10/19");
    });

    it("【気になる点】週の始まりは moment の言語で決まり、カレンダーの「週の始まり」の設定は見ない", () => {
        // 2026-11-01 is a Sunday. With a Sunday-first week, its {{monday}} is the next day;
        // someone whose calendar starts weeks on Monday would expect 2026-10-26
        const sunday = moment("2026-11-01", DEFAULT_FORMAT);
        expect(replace("{{monday}}", sunday)).toBe("2026-11-02");
    });
});

describe("replaceTemplateContents: 置き換えないもの", () => {
    it("知らない名前はそのまま残す", () => {
        expect(replace("{{foo}} {{foo:YYYY}}")).toBe("{{foo}} {{foo:YYYY}}");
    });

    it("自然言語の日付（{{tomorrow}} など）は置き換えない（2026-10-29 に削った）", () => {
        expect(replace("{{tomorrow}} {{next friday}}")).toBe("{{tomorrow}} {{next friday}}");
    });

    it("Templater の <% %> と、dataviewjs の ${...} には触らない", () => {
        const template = [
            "prev [[<% prev %>]]",
            "const today = '{{date:YYYY-MM-DD}}';",
            "dv.pages(`[[${today}]]`);",
        ].join("\n");
        expect(replace(template)).toBe(
            ["prev [[<% prev %>]]", "const today = '2026-10-29';", "dv.pages(`[[${today}]]`);"].join("\n"),
        );
    });

    it("空のテンプレートは空のまま", () => {
        expect(replace("")).toBe("");
    });
});
