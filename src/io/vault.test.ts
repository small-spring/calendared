import moment from "moment";
import { TFile, TFolder } from "obsidian";
import { writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Characterization tests: they pin down which file a calendar cell looks for today, so the lookup can be reworked
// (docs/state.md, ADR-S2). Obsidian (the vault, the metadata cache, the core Daily notes plugin) and the settings
// store are stand-ins; the path calculation, the vault source and reading stickers are the real code.

const fake = vi.hoisted(() => ({
    files: new Map<string, unknown>(),
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
                },
                metadataCache: { getFileCache: (file: TFile) => fake.caches.get(file.path) ?? null },
                internalPlugins: { getPluginById: () => fake.dailyNotes },
            },
        }),
    },
}));

const settings = vi.hoisted(() => {
    const period = (enabled: boolean, format: string, folder: string) => {
        const selectedFormat = { id: "s", value: format, error: "", loading: false };
        return { enabled, openAtStartup: false, selectedFormat, formats: { s: selectedFormat }, folder, templatePath: "" };
    };
    const initial = () => ({
        periods: {
            day: period(true, "YYYY-MM-DD", "日記"),
            week: period(true, "GGGG-[W]WW", "週/"),
            month: period(true, "YYYY-MM", "/"),
            quarter: period(false, "YYYY-[Q]Q", "四半期"),
            year: period(true, "YYYY", "年"),
        },
        localeSettings: { localeOverride: "en", weekStartId: 1, weekNumbering: "iso" as const },
        stickersEnabled: true,
        stickerProperty: "sticker",
    });
    return { period, initial };
});

vi.mock("@/settings", async () => {
    const { DEFAULT_FORMATS_PER_GRANULARITY } = await import("@/constants");
    return {
        settingsStore: writable(settings.initial()),
        getDefaultPeriodicNotesConfig: (g: keyof typeof DEFAULT_FORMATS_PER_GRANULARITY) =>
            settings.period(g === "day" || g === "week", DEFAULT_FORMATS_PER_GRANULARITY[g], "/"),
    };
});

const { settingsStore } = await import("@/settings");
const { getNotePath, getFileData, noteAt, notesWithFormatIn } = await import("./vault");
const { initVaultSource } = await import("./vault-source");
const { PluginService } = await import("@/app-service");

// the vault source asks the same stand-in Obsidian
// @ts-expect-error the stand-in has only what the lookups use
initVaultSource(PluginService.getPlugin().app);

const date = (d: string) => moment(d, "YYYY-MM-DD");
const fileAt = (path: string) => Object.assign(new TFile(), { path });

beforeEach(() => {
    fake.files.clear();
    fake.caches.clear();
    fake.dailyNotes = null;
    (settingsStore as ReturnType<typeof writable>).set(settings.initial());
});

describe("getNotePath: 周期と日付から、そのノートのパスを決める", () => {
    it("その周期の設定のフォルダと、選んでいる書式で名前を作る", () => {
        expect(getNotePath("day", date("2026-10-30"))).toBe("日記/2026-10-30.md");
        expect(getNotePath("year", date("2026-10-30"))).toBe("年/2026.md");
    });

    it("フォルダが / （Vault の一番上）なら、フォルダなしのパスになる", () => {
        expect(getNotePath("month", date("2026-10-30"))).toBe("2026-10.md");
    });

    it("フォルダの最後の / はあってもなくても同じ", () => {
        expect(getNotePath("week", date("2026-10-30"))).toBe("週/2026-W44.md");
    });

    it("週次ノートは、日付を含む週（週の始まりの設定に従う）の名前になる", () => {
        // 2026-11-01 is a Sunday: with Monday-first weeks it belongs to the week of 10-26 (ISO week 44)
        expect(getNotePath("week", date("2026-11-01"))).toBe("週/2026-W44.md");
    });

    it("書式に .md が含まれていれば、もう一度は足さない", () => {
        settingsStore.update((s) => {
            s.periods.day.selectedFormat.value = "YYYY-MM-DD[.md]";
            return s;
        });
        expect(getNotePath("day", date("2026-10-30"))).toBe("日記/2026-10-30.md");
    });

    it("書式に / があれば、フォルダの下のフォルダになる", () => {
        settingsStore.update((s) => {
            s.periods.day.selectedFormat.value = "YYYY/MM/YYYY-MM-DD";
            return s;
        });
        expect(getNotePath("day", date("2026-10-30"))).toBe("日記/2026/10/2026-10-30.md");
    });

    it("無効にした周期は、その周期の既定の書式とフォルダ / で作る（自分の設定は使わない）", () => {
        expect(getNotePath("quarter", date("2026-10-30"))).toBe("2026-Q4.md");
    });

    describe("日次ノートを無効にしているとき", () => {
        beforeEach(() => {
            settingsStore.update((s) => {
                s.periods.day.enabled = false;
                return s;
            });
        });

        it("Obsidian のコアプラグイン「デイリーノート」がオンなら、その書式とフォルダを使う", () => {
            fake.dailyNotes = { enabled: true, instance: { options: { format: "YYYYMMDD", folder: "Daily" } } };
            expect(getNotePath("day", date("2026-10-30"))).toBe("Daily/20261030.md");
        });

        it("デイリーノートの書式やフォルダが空なら、既定の書式と / を使う", () => {
            fake.dailyNotes = { enabled: true, instance: { options: { format: "", folder: "" } } };
            expect(getNotePath("day", date("2026-10-30"))).toBe("2026-10-30.md");
        });

        it("デイリーノートもオフなら、既定の書式とフォルダ / で作る", () => {
            fake.dailyNotes = { enabled: false };
            expect(getNotePath("day", date("2026-10-30"))).toBe("2026-10-30.md");
        });
    });
});

describe("getFileData: その日付の周期ノートと、そのステッカー", () => {
    it("パスにファイルがあれば、そのファイルとステッカーを返す", () => {
        const file = fileAt("日記/2026-10-30.md");
        fake.files.set(file.path, file);
        fake.caches.set(file.path, { frontmatter: { sticker: "🍙" } });
        expect(getFileData("day", date("2026-10-30"))).toEqual({ file, sticker: { emoji: "🍙" } });
    });

    it("ファイルがあってもステッカーがなければ、ステッカーは null", () => {
        const file = fileAt("日記/2026-10-30.md");
        fake.files.set(file.path, file);
        expect(getFileData("day", date("2026-10-30"))).toEqual({ file, sticker: null });
    });

    it("パスにファイルがなければ、どちらも null", () => {
        expect(getFileData("day", date("2026-10-30"))).toEqual({ file: null, sticker: null });
    });

    it("パスにあるのがフォルダなら、ないのと同じ", () => {
        fake.files.set("日記/2026-10-30.md", Object.assign(new TFolder(), { path: "日記/2026-10-30.md" }));
        expect(getFileData("day", date("2026-10-30"))).toEqual({ file: null, sticker: null });
    });

    it("周期か日付がなければ、どちらも null", () => {
        expect(getFileData(null, date("2026-10-30"))).toEqual({ file: null, sticker: null });
        expect(getFileData("day", null)).toEqual({ file: null, sticker: null });
    });
});

describe("noteAt: 渡した設定で、その日付の周期ノートとステッカーを読む（画面用。設定の変化を Svelte が追える）", () => {
    it("ストアではなく、渡した設定のフォルダと書式で探す", () => {
        const file = fileAt("別/2026-10-30.md");
        fake.files.set(file.path, file);
        const passed = settings.initial();
        passed.periods.day.folder = "別";
        expect(noteAt("day", date("2026-10-30"), passed)).toEqual({ file, sticker: null });
    });

    it("ストアではなく、渡した設定のステッカーのプロパティで読む", () => {
        const file = fileAt("日記/2026-10-30.md");
        fake.files.set(file.path, file);
        fake.caches.set(file.path, { frontmatter: { sticker: "🍙", mood: "😀" } });
        expect(noteAt("day", date("2026-10-30"), { ...settings.initial(), stickerProperty: "mood" })).toEqual({
            file,
            sticker: { emoji: "😀" },
        });
    });

    it("日次ノートを無効にしていれば、窓口から読んだコアプラグイン「デイリーノート」の設定で探す", () => {
        const file = fileAt("Daily/20261030.md");
        fake.files.set(file.path, file);
        fake.dailyNotes = { enabled: true, instance: { options: { format: "YYYYMMDD", folder: "Daily" } } };
        const passed = settings.initial();
        passed.periods.day.enabled = false;
        expect(noteAt("day", date("2026-10-30"), passed)).toEqual({ file, sticker: null });
    });
});

describe("notesWithFormatIn: 設定画面の「書式ごとのファイル数」。その周期のフォルダで、書式に名前が合うノート", () => {
    const note = (path: string) =>
        Object.assign(new TFile(), { path, basename: path.slice(path.lastIndexOf("/") + 1, -3), extension: "md" });

    it("周期の設定のフォルダから、窓口の今のファイルを数える", () => {
        for (const path of ["日記/2026-10-30.md", "日記/メモ.md", "2026-10-31.md"]) fake.files.set(path, note(path));
        expect(notesWithFormatIn("day", "YYYY-MM-DD", settings.initial())).toEqual(["日記/2026-10-30.md"]);
    });

    it("選んでいない書式でも、その書式で数える", () => {
        fake.files.set("日記/20261030.md", note("日記/20261030.md"));
        expect(notesWithFormatIn("day", "YYYYMMDD", settings.initial())).toEqual(["日記/20261030.md"]);
    });

    it("日次ノートを無効にしていれば、コアプラグイン「デイリーノート」のフォルダで数える", () => {
        fake.files.set("Daily/2026-10-30.md", note("Daily/2026-10-30.md"));
        fake.files.set("ほか/2026-10-31.md", note("ほか/2026-10-31.md"));
        fake.dailyNotes = { enabled: true, instance: { options: { format: "YYYY-MM-DD", folder: "Daily" } } };
        const passed = settings.initial();
        passed.periods.day.enabled = false;
        expect(notesWithFormatIn("day", "YYYY-MM-DD", passed)).toEqual(["Daily/2026-10-30.md"]);
    });
});
