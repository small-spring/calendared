import { describe, expect, it } from "vitest";
import { currentNoteName, invalidFormatMessage, periodicityTitle, turnedOffMessage } from "./period-words";

describe("周期の言葉（画面・知らせ・コマンドの名前）", () => {
    it("periodicityTitle: 周期の形容詞を大文字で始める", () => {
        expect(periodicityTitle("day")).toBe("Daily");
        expect(periodicityTitle("week")).toBe("Weekly");
        expect(periodicityTitle("quarter")).toBe("Quarterly");
    });

    it("turnedOffMessage: 周期がオフのときの知らせ", () => {
        expect(turnedOffMessage("day")).toBe("Daily notes are turned off in settings");
        expect(turnedOffMessage("year")).toBe("Yearly notes are turned off in settings");
    });

    it("invalidFormatMessage: 書式がまちがっていてノートを作らないときの知らせ（改行や続く空白は 1 つの空白にまとめる）", () => {
        expect(invalidFormatMessage("day", "Format is empty")).toBe("Daily note format is invalid: Format is empty");
        expect(invalidFormatMessage("month", "Ambiguous format. It doesn't uniquely identify a month. \n                    Current: x")).toBe(
            "Monthly note format is invalid: Ambiguous format. It doesn't uniquely identify a month. Current: x",
        );
    });

    it("currentNoteName: 今の期間のノートの呼び方（起動時の選択肢は大文字で始め、コマンドは Open のあと）", () => {
        expect(currentNoteName("day")).toBe("Today's note");
        expect(currentNoteName("week")).toBe("This week's note");
        expect(currentNoteName("quarter")).toBe("This quarter's note");
        expect(currentNoteName("day", "open")).toBe("Open today's note");
        expect(currentNoteName("month", "open")).toBe("Open this month's note");
    });
});
