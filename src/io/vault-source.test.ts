import { TFile, TFolder } from "obsidian";
import { beforeEach, describe, expect, it } from "vitest";
import { fileAt } from "@/test-fixtures";
import { createVaultSource, watchVault } from "./vault-source";

// The vault source reads Obsidian as it is (no copies) and tells its readers to read again when Obsidian reports a
// change (docs/adr/0016). Obsidian is a stand-in that records listeners and lets a test fire its events.

type Listener = (...args: unknown[]) => void;

function fakeEvents() {
    const listeners = new Map<string, Set<Listener>>();
    return {
        on(name: string, callback: Listener) {
            if (!listeners.has(name)) listeners.set(name, new Set());
            listeners.get(name)!.add(callback);
            return { name, callback };
        },
        offref(ref: { name: string; callback: Listener }) {
            listeners.get(ref.name)?.delete(ref.callback);
        },
        trigger(name: string, ...args: unknown[]) {
            listeners.get(name)?.forEach((callback) => callback(...args));
        },
        count() {
            return [...listeners.values()].reduce((n, set) => n + set.size, 0);
        },
    };
}

function fakeApp() {
    const files = new Map<string, unknown>();
    const caches = new Map<string, unknown>();
    let activeFile: unknown = null;
    const vault = Object.assign(fakeEvents(), {
        getAbstractFileByPath: (path: string) => files.get(path) ?? null,
        getMarkdownFiles: () => [...files.values()].filter((f) => f instanceof TFile && f.path.endsWith(".md")),
    });
    const metadataCache = Object.assign(fakeEvents(), { getFileCache: (file: TFile) => caches.get(file.path) ?? null });
    const workspace = Object.assign(fakeEvents(), { getActiveFile: () => activeFile });
    return {
        app: { vault, metadataCache, workspace },
        files,
        caches,
        setActiveFile: (value: unknown) => (activeFile = value),
        listenerCount: () => vault.count() + metadataCache.count() + workspace.count(),
    };
}

describe("watchVault: Obsidian の出来事を、読み直しの合図にする", () => {
    let fake: ReturnType<typeof fakeApp>;
    let pending: (() => void)[];
    let changes: number;
    let stop: () => void;

    // the frame scheduler is in the test's hands: a batch is delivered when the test runs the scheduled frames
    const runFrames = () => pending.splice(0).forEach((run) => run());

    beforeEach(() => {
        fake = fakeApp();
        pending = [];
        changes = 0;
        // @ts-expect-error the stand-in has only what the vault source uses
        stop = watchVault(fake.app, () => changes++, (run) => pending.push(run));
    });

    it.each([
        ["ファイルの作成", () => fake.app.vault.trigger("create", fileAt("a.md"))],
        ["ファイルの削除", () => fake.app.vault.trigger("delete", fileAt("a.md"))],
        ["ファイルの名前の変更", () => fake.app.vault.trigger("rename", fileAt("b.md"), "a.md")],
        ["メタデータの変化", () => fake.app.metadataCache.trigger("changed", fileAt("a.md"))],
        ["ノートを開いた", () => fake.app.workspace.trigger("file-open", fileAt("a.md"))],
    ])("%sで知らせる", (_, fire) => {
        fire();
        runFrames();
        expect(changes).toBe(1);
    });

    it("フォルダの名前の変更でも知らせる（中のノートのパスが変わる）", () => {
        fake.app.vault.trigger("rename", Object.assign(new TFolder(), { path: "新" }), "旧");
        runFrames();
        expect(changes).toBe(1);
    });

    it("すぐには知らせず、次のコマで知らせる", () => {
        fake.app.vault.trigger("create", fileAt("a.md"));
        expect(changes).toBe(0);
        runFrames();
        expect(changes).toBe(1);
    });

    it("同じコマの間の出来事はまとめて 1 回にする", () => {
        fake.app.vault.trigger("create", fileAt("a.md"));
        fake.app.metadataCache.trigger("changed", fileAt("a.md"));
        fake.app.workspace.trigger("file-open", fileAt("a.md"));
        expect(pending).toHaveLength(1);
        runFrames();
        expect(changes).toBe(1);
    });

    it("知らせたあとの出来事は、また次のコマで知らせる", () => {
        fake.app.vault.trigger("create", fileAt("a.md"));
        runFrames();
        fake.app.vault.trigger("delete", fileAt("a.md"));
        runFrames();
        expect(changes).toBe(2);
    });

    it("関係ない出来事（ファイルの中身の書き換えなど）では知らせない", () => {
        fake.app.vault.trigger("modify", fileAt("a.md"));
        fake.app.workspace.trigger("layout-change");
        runFrames();
        expect(changes).toBe(0);
    });

    it("止めたら、Obsidian への登録を全部外す", () => {
        expect(fake.listenerCount()).toBeGreaterThan(0);
        stop();
        expect(fake.listenerCount()).toBe(0);
    });

    it("止めたあとは、待っていた知らせも出さない", () => {
        fake.app.vault.trigger("create", fileAt("a.md"));
        stop();
        runFrames();
        expect(changes).toBe(0);
    });
});

describe("createVaultSource: Obsidian にそのまま聞く", () => {
    let fake: ReturnType<typeof fakeApp>;
    let source: ReturnType<typeof createVaultSource>;

    beforeEach(() => {
        fake = fakeApp();
        // @ts-expect-error the stand-in has only what the vault source uses
        source = createVaultSource(fake.app);
    });

    it("fileAt: パスにあるのがフォルダなら null", () => {
        fake.files.set("日記", Object.assign(new TFolder(), { path: "日記" }));
        expect(source.fileAt("日記")).toBeNull();
    });

    it("fileAt: パスにあるファイルを返す（なければ null）。写しを持たないので、Obsidian の今を返す", () => {
        const file = fileAt("a.md");
        expect(source.fileAt("a.md")).toBeNull();
        fake.files.set("a.md", file);
        expect(source.fileAt("a.md")).toBe(file);
        fake.files.delete("a.md");
        expect(source.fileAt("a.md")).toBeNull();
    });

    it("folderAt: パスにあるフォルダを返す（何もないか、ファイルなら null）", () => {
        const folder = Object.assign(new TFolder(), { path: "日記" });
        fake.files.set("日記", folder);
        fake.files.set("a.md", fileAt("a.md"));
        expect(source.folderAt("日記")).toBe(folder);
        expect(source.folderAt("a.md")).toBeNull();
        expect(source.folderAt("ない")).toBeNull();
    });

    it("metadataOf: ファイルのメタデータを返す（なければ null）", () => {
        const cache = { frontmatter: { sticker: "👍" } };
        fake.caches.set("a.md", cache);
        expect(source.metadataOf(fileAt("a.md"))).toBe(cache);
        expect(source.metadataOf(fileAt("b.md"))).toBeNull();
    });

    it("markdownFiles: Vault の Markdown のファイルを全部返す（今のもの）", () => {
        const a = fileAt("a.md");
        const b = fileAt("日記/b.md");
        fake.files.set(a.path, a);
        fake.files.set(b.path, b);
        expect(source.markdownFiles()).toEqual([a, b]);
        fake.files.delete(a.path);
        expect(source.markdownFiles()).toEqual([b]);
    });

    it("activeFile: Obsidian が開いているノートとするものを返す（なければ null）", () => {
        expect(source.activeFile()).toBeNull();
        const file = fileAt("日記/2026-10-30.md");
        fake.setActiveFile(file);
        expect(source.activeFile()).toBe(file);
    });
});
