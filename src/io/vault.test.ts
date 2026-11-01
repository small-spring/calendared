import { TFile, TFolder } from "obsidian";
import { Notice } from "@/test-obsidian"; // the stand-in that "obsidian" points to in tests, with the messages shown
import { d, fileAt, testSettings } from "@/test-fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Characterization tests: they pin down which file a calendar cell looks for today, so the lookup can be reworked
// (docs/adr/0016). Obsidian (the vault, the metadata cache, the core Daily notes plugin) and the settings
// store are stand-ins; the path calculation, the vault source and reading stickers are the real code.

const fake = vi.hoisted(() => ({
    files: new Map<string, unknown>(),
    contents: new Map<string, string>(),
    created: [] as string[],
    caches: new Map<string, unknown>(),
    dailyNotes: null as null | { enabled: boolean; instance?: { options?: Record<string, unknown> } },
}));

vi.mock("@/app-service", () => ({
    PluginService: {
        getPlugin: () => ({
            app: {
                vault: {
                    getAbstractFileByPath: (path: string) => fake.files.get(path) ?? null,
                    getMarkdownFiles: () => [...fake.files.values()].filter((f) => f instanceof TFile),
                    cachedRead: async (file: TFile) => {
                        const text = fake.contents.get(file.path);
                        if (text === undefined) throw new Error("unreadable");
                        return text;
                    },
                    create: async (path: string) => void fake.created.push(path),
                    createFolder: async (path: string) => void fake.created.push(path),
                },
                metadataCache: { getFileCache: (file: TFile) => fake.caches.get(file.path) ?? null },
                internalPlugins: { getPluginById: () => fake.dailyNotes },
            },
        }),
    },
}));

// the settings in these tests: each period's folder written a different way, quarterly notes off
const settings = () =>
    testSettings({
        day: { folder: "日記" },
        week: { folder: "週/" },
        month: { folder: "/" },
        quarter: { enabled: false, folder: "四半期" },
        year: { folder: "年" },
    });

vi.mock("@/settings", async () => (await import("@/test-fixtures")).settingsModule());

const { settingsStore } = await import("@/settings");
const { getNotePath, getFileData, noteAt, notesWithFormatIn, getTemplateInfo } = await import("./vault");
const { initVaultSource } = await import("./vault-source");
const { PluginService } = await import("@/app-service");

// the vault source asks the same stand-in Obsidian
// @ts-expect-error the stand-in has only what the lookups use
initVaultSource(PluginService.getPlugin().app);

beforeEach(() => {
    fake.files.clear();
    fake.contents.clear();
    fake.created = [];
    fake.caches.clear();
    fake.dailyNotes = null;
    settingsStore.set(settings());
});

describe("getNotePath: 周期と日付から、そのノートのパスを決める", () => {
    // how a path is made from the folder and the format is tested in note-path.test.ts; here, that the settings are read

    it("その周期の設定のフォルダと、選んでいる書式で名前を作る", () => {
        expect(getNotePath("day", d("2026-10-30"))).toBe("日記/2026-10-30.md");
        expect(getNotePath("year", d("2026-10-30"))).toBe("年/2026.md");
    });

    it("週次ノートは、日付を含む週（週の始まりの設定に従う）の名前になる", () => {
        // 2026-11-01 is a Sunday: with Monday-first weeks it belongs to the week of 10-26 (ISO week 44)
        expect(getNotePath("week", d("2026-11-01"))).toBe("週/2026-W44.md");
    });

    it("無効にした周期も、その周期の設定の書式とフォルダで探す（既定の書式には戻さない）", () => {
        expect(getNotePath("quarter", d("2026-10-30"))).toBe("四半期/2026-Q4.md");
        settingsStore.update((s) => {
            s.periods.quarter.format = "YYYY年Q四半期";
            return s;
        });
        expect(getNotePath("quarter", d("2026-10-30"))).toBe("四半期/2026年4四半期.md");
    });

    describe("日次ノートを無効にしているとき", () => {
        beforeEach(() => {
            settingsStore.update((s) => {
                s.periods.day.enabled = false;
                return s;
            });
        });

        it("Obsidian のコアプラグイン「デイリーノート」がオンでも、その設定は使わず、日の設定の書式とフォルダで探す", () => {
            fake.dailyNotes = { enabled: true, instance: { options: { format: "YYYYMMDD", folder: "Daily" } } };
            expect(getNotePath("day", d("2026-10-30"))).toBe("日記/2026-10-30.md");
        });

        it("デイリーノートもオフでも、日の設定の書式とフォルダで探す", () => {
            fake.dailyNotes = { enabled: false };
            expect(getNotePath("day", d("2026-10-30"))).toBe("日記/2026-10-30.md");
        });
    });
});

describe("getFileData: その日付の周期ノートと、そのステッカー", () => {
    it("パスにファイルがあれば、そのファイルとステッカーを返す", () => {
        const file = fileAt("日記/2026-10-30.md");
        fake.files.set(file.path, file);
        fake.caches.set(file.path, { frontmatter: { sticker: "🍙" } });
        expect(getFileData("day", d("2026-10-30"))).toEqual({ file, sticker: { emoji: "🍙" } });
    });

    it("ファイルがあってもステッカーがなければ、ステッカーは null", () => {
        const file = fileAt("日記/2026-10-30.md");
        fake.files.set(file.path, file);
        expect(getFileData("day", d("2026-10-30"))).toEqual({ file, sticker: null });
    });

    it("パスにファイルがなければ、どちらも null", () => {
        expect(getFileData("day", d("2026-10-30"))).toEqual({ file: null, sticker: null });
    });

    it("パスにあるのがフォルダなら、ないのと同じ", () => {
        fake.files.set("日記/2026-10-30.md", Object.assign(new TFolder(), { path: "日記/2026-10-30.md" }));
        expect(getFileData("day", d("2026-10-30"))).toEqual({ file: null, sticker: null });
    });

    it("周期か日付がなければ、どちらも null", () => {
        expect(getFileData(null, d("2026-10-30"))).toEqual({ file: null, sticker: null });
        expect(getFileData("day", null)).toEqual({ file: null, sticker: null });
    });
});

describe("noteAt: 渡した設定で、その日付の周期ノートとステッカーを読む（画面用。設定の変化を Svelte が追える）", () => {
    it("ストアではなく、渡した設定のフォルダと書式で探す", () => {
        const file = fileAt("別/2026-10-30.md");
        fake.files.set(file.path, file);
        const passed = settings();
        passed.periods.day.folder = "別";
        expect(noteAt("day", d("2026-10-30"), passed)).toEqual({ file, sticker: null });
    });

    it("ストアではなく、渡した設定のステッカーのプロパティで読む", () => {
        const file = fileAt("日記/2026-10-30.md");
        fake.files.set(file.path, file);
        fake.caches.set(file.path, { frontmatter: { sticker: "🍙", mood: "😀" } });
        expect(noteAt("day", d("2026-10-30"), { ...settings(), stickerProperty: "mood" })).toEqual({
            file,
            sticker: { emoji: "😀" },
        });
    });

    it("日次ノートを無効にしていても、日の設定のフォルダと書式で探す（書式を変えてからオフにしても見つかる）", () => {
        const file = fileAt("日記/20261030.md");
        fake.files.set(file.path, file);
        const passed = settings();
        passed.periods.day.format = "YYYYMMDD";
        passed.periods.day.enabled = false;
        expect(noteAt("day", d("2026-10-30"), passed)).toEqual({ file, sticker: null });
    });

    it("日次ノートを無効にしていても、コアプラグイン「デイリーノート」の設定では探さない", () => {
        const file = fileAt("Daily/20261030.md");
        fake.files.set(file.path, file);
        fake.dailyNotes = { enabled: true, instance: { options: { format: "YYYYMMDD", folder: "Daily" } } };
        const passed = settings();
        passed.periods.day.enabled = false;
        expect(noteAt("day", d("2026-10-30"), passed)).toEqual({ file: null, sticker: null });
    });
});

describe("notesWithFormatIn: 設定画面の「書式ごとのファイル数」。その周期のフォルダで、書式に名前が合うノート", () => {
    const note = (path: string) =>
        Object.assign(new TFile(), { path, basename: path.slice(path.lastIndexOf("/") + 1, -3), extension: "md" });

    it("周期の設定のフォルダから、窓口の今のファイルを数える", () => {
        for (const path of ["日記/2026-10-30.md", "日記/メモ.md", "2026-10-31.md"]) fake.files.set(path, note(path));
        expect(notesWithFormatIn("day", "YYYY-MM-DD", settings())).toEqual(["日記/2026-10-30.md"]);
    });

    it("選んでいない書式でも、その書式で数える", () => {
        fake.files.set("日記/20261030.md", note("日記/20261030.md"));
        expect(notesWithFormatIn("day", "YYYYMMDD", settings())).toEqual(["日記/20261030.md"]);
    });

    it("日次ノートを無効にしていても、コアプラグイン「デイリーノート」のフォルダではなく、日の設定のフォルダで数える", () => {
        for (const path of ["日記/2026-10-30.md", "Daily/2026-10-31.md", "2026-11-01.md"]) fake.files.set(path, note(path));
        fake.dailyNotes = { enabled: true, instance: { options: { format: "YYYY-MM-DD", folder: "Daily" } } };
        const passed = settings();
        passed.periods.day.enabled = false;
        expect(notesWithFormatIn("day", "YYYY-MM-DD", passed)).toEqual(["日記/2026-10-30.md"]);
    });
});

describe("getTemplateInfo: ノートを作るときのテンプレートの中身", () => {
    it("テンプレートのファイルがあれば、その中身を返す", async () => {
        fake.files.set("テンプレート/日.md", fileAt("テンプレート/日.md"));
        fake.contents.set("テンプレート/日.md", "# {{title}}");
        expect(await getTemplateInfo("テンプレート/日.md", "day")).toBe("# {{title}}");
    });

    it("パスに .md がなければ補わない。そのパスのファイルはないので、空にして知らせる（前の版で .md なしで保存された設定）", async () => {
        Notice.shown.length = 0;
        fake.files.set("テンプレート/日.md", fileAt("テンプレート/日.md"));
        fake.contents.set("テンプレート/日.md", "# {{title}}");
        expect(await getTemplateInfo("テンプレート/日", "day")).toBe("");
        expect(Notice.shown).toEqual(["Daily note template not found: テンプレート/日"]);
    });

    it("テンプレートを選んでいなければ、空。知らせない", async () => {
        Notice.shown.length = 0;
        expect(await getTemplateInfo("", "day")).toBe("");
        expect(fake.created).toEqual([]);
        expect(Notice.shown).toEqual([]);
    });

    it("テンプレートのファイルがなければ、空として扱い、その周期の言葉で知らせる。ファイルもフォルダも作らない", async () => {
        Notice.shown.length = 0;
        expect(await getTemplateInfo("テンプレート/週.md", "week")).toBe("");
        expect(fake.created).toEqual([]);
        expect(Notice.shown).toEqual(["Weekly note template not found: テンプレート/週.md"]);
    });

    it("パスにあるのがフォルダなら、ないのと同じ", async () => {
        fake.files.set("テンプレート/日.md", Object.assign(new TFolder(), { path: "テンプレート/日.md" }));
        expect(await getTemplateInfo("テンプレート/日.md", "day")).toBe("");
        expect(fake.created).toEqual([]);
    });

    it("読めなければ空にし、その周期の言葉で知らせる", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        Notice.shown.length = 0;
        fake.files.set("テンプレート/週.md", fileAt("テンプレート/週.md"));
        expect(await getTemplateInfo("テンプレート/週.md", "week")).toBe("");
        expect(Notice.shown).toEqual(["Failed to read the weekly note template"]);
        expect(error.mock.calls[0][0]).toBe("Failed to read the weekly note template 'テンプレート/週.md'");
        error.mockRestore();
    });
});
