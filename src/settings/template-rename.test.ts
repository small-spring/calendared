import { describe, expect, it } from "vitest";
import { granularities } from "@/constants";
import type { IGranularity } from "@/io";
import { followTemplateRename } from "./template-rename";

type Periods = Record<IGranularity, { templatePath: string }>;
const periods = (paths: Partial<Record<IGranularity, string>>): Periods =>
    Object.fromEntries(granularities.map((g) => [g, { templatePath: paths[g] ?? "" }])) as Periods;

describe("followTemplateRename: テンプレートの名前を変えたり移したりしたら、設定のパスも付いていく", () => {
    it("そのファイルをテンプレートにしている周期のパスを、新しいパスにする", () => {
        const next = followTemplateRename(periods({ day: "テンプレート/日.md", week: "テンプレート/週.md" }), "テンプレート/日.md", "型/日記.md");
        expect(next?.day.templatePath).toBe("型/日記.md");
        expect(next?.week.templatePath).toBe("テンプレート/週.md");
    });

    it("同じファイルを使う周期はどれも変わる", () => {
        const next = followTemplateRename(periods({ day: "t.md", month: "t.md" }), "t.md", "u.md");
        expect(next?.day.templatePath).toBe("u.md");
        expect(next?.month.templatePath).toBe("u.md");
    });

    it("テンプレートの入ったフォルダの名前を変えたら、その下のパスも変わる", () => {
        const next = followTemplateRename(periods({ day: "テンプレート/日.md" }), "テンプレート", "型");
        expect(next?.day.templatePath).toBe("型/日.md");
    });

    it("名前が前だけ同じフォルダ（テンプレート2）は変えない", () => {
        expect(followTemplateRename(periods({ day: "テンプレート2/日.md" }), "テンプレート", "型")).toBeNull();
    });

    it("関係のないファイルなら null（設定を書き換えない）", () => {
        expect(followTemplateRename(periods({ day: "テンプレート/日.md" }), "メモ.md", "メモ2.md")).toBeNull();
        expect(followTemplateRename(periods({}), "メモ.md", "メモ2.md")).toBeNull();
    });
});
