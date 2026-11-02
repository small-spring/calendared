import { Notice } from "@/test-obsidian"; // the stand-in that "obsidian" points to in tests, with the messages shown
import { d, fileAt, testSettings } from "@/test-fixtures";
import type { TFile } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Where a note is made: an invalid format stops it (docs/adr/0051). Obsidian (the vault, the leaf, the confirmation
// dialog) and the settings store are stand-ins; the check, the path and the note's name are the real code

const fake = vi.hoisted(() => ({
    files: new Map<string, unknown>(),
    created: [] as string[],
    dialogs: [] as unknown[],
}));

vi.mock("@/app-service", () => ({
    PluginService: {
        getPlugin: () => ({
            app: {
                vault: {
                    getAbstractFileByPath: (path: string) => fake.files.get(path) ?? null,
                    create: async (path: string) => {
                        fake.created.push(path);
                        const { TFile } = await import("obsidian");
                        return Object.assign(new TFile(), { path });
                    },
                    createFolder: async () => {},
                },
            },
        }),
    },
}));
vi.mock("@/settings", async () => (await import("@/test-fixtures")).settingsModule());
vi.mock("@/ui/modals/confirmation", () => ({ createConfirmationDialog: (params: unknown) => void fake.dialogs.push(params) }));
vi.mock("./CreateNote.svelte", () => ({ default: {} }));

const { createOrOpenNote } = await import("./create-or-open-note");
const { settingsStore } = await import("@/settings");

const opened: string[] = [];
const leaf = { openFile: async (file: TFile) => void opened.push(file.path) } as never;

function useSettings(...args: Parameters<typeof testSettings>) {
    settingsStore.set(testSettings(...args));
}

beforeEach(() => {
    fake.files.clear();
    fake.created.length = 0;
    fake.dialogs.length = 0;
    opened.length = 0;
    Notice.shown.length = 0;
    useSettings();
});

describe("createOrOpenNote: 書式がまちがっていれば、ノートを作らずに知らせる（docs/adr/0051）", () => {
    it("正しい書式なら、ノートを作って開く", async () => {
        await createOrOpenNote({ leaf, date: d("2026-11-02"), granularity: "day", confirmBeforeCreateOverride: false });
        expect(fake.created).toEqual(["2026-11-02.md"]);
        expect(opened).toEqual(["2026-11-02.md"]);
        expect(Notice.shown).toEqual([]);
    });

    it("まちがった書式なら、作らず、周期の言葉と設定画面と同じ誤りの文で知らせる", async () => {
        useSettings({ day: { format: "YYYY-MM" } });
        await createOrOpenNote({ leaf, date: d("2026-11-02"), granularity: "day", confirmBeforeCreateOverride: false });
        expect(fake.created).toEqual([]);
        expect(opened).toEqual([]);
        expect(Notice.shown).toEqual([
            "Daily note format is invalid: Ambiguous format. Missing day (D) info. Can't uniquely identify day.",
        ]);
    });

    it("使えない記号のある書式でも作らない（ほかの周期でも、その周期の言葉で）", async () => {
        useSettings({ month: { format: "YYYY-MM-DD" } });
        await createOrOpenNote({ leaf, date: d("2026-11-01"), granularity: "month", confirmBeforeCreateOverride: false });
        expect(fake.created).toEqual([]);
        expect(Notice.shown).toEqual([
            "Monthly note format is invalid: DD can't be used in monthly note names. Use the year and month.",
        ]);
    });

    it("作る前に確かめる設定でも、確かめの画面を出さずに知らせる", async () => {
        useSettings({ day: { format: "YYYY-MM" } });
        await createOrOpenNote({ leaf, date: d("2026-11-02"), granularity: "day", confirmBeforeCreateOverride: true });
        expect(fake.dialogs).toEqual([]);
        expect(Notice.shown).toHaveLength(1);
    });

    it("空の書式（空白だけ）でも作らない", async () => {
        useSettings({ day: { format: " " } });
        await createOrOpenNote({ leaf, date: d("2026-11-02"), granularity: "day", confirmBeforeCreateOverride: false });
        expect(fake.created).toEqual([]);
        expect(Notice.shown).toEqual(["Daily note format is invalid: Format is empty"]);
    });

    it("まちがった書式でも、その名前のノートがすでにあれば開く（止めるのは作るときだけ）", async () => {
        useSettings({ day: { format: "YYYY-MM" } });
        fake.files.set("2026-11.md", fileAt("2026-11.md"));
        await createOrOpenNote({ leaf, date: d("2026-11-02"), granularity: "day", confirmBeforeCreateOverride: false });
        expect(opened).toEqual(["2026-11.md"]);
        expect(fake.created).toEqual([]);
        expect(Notice.shown).toEqual([]);
    });

    it("オフの周期は、書式がまちがっていても、オフの知らせだけを出す", async () => {
        useSettings({ day: { enabled: false, format: "YYYY-MM" } });
        await createOrOpenNote({ leaf, date: d("2026-11-02"), granularity: "day", confirmBeforeCreateOverride: false });
        expect(fake.created).toEqual([]);
        expect(Notice.shown).toEqual(["Daily notes are turned off in settings"]);
    });
});
