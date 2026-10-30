import { DAILY_NOTES_PLUGIN_ID } from "@/constants";
import { type App, type CachedMetadata, type EventRef, TFile, TFolder } from "obsidian";
import { tick } from "svelte";
import { createSubscriber } from "svelte/reactivity";
import type { DnPluginSettings } from "./settings";

/**
 * Calendared: the one place the UI reads what Obsidian knows (docs/state.md, ADR-S2). It keeps no copies: every read
 * asks Obsidian as it is now. Reads made while rendering (in `$derived`, templates, effects) are tracked, and run
 * again once Obsidian reports a change.
 */
export type VaultSource = {
    /** The file at the path, or null (nothing there, or a folder) */
    fileAt(path: string): TFile | null;
    /** The folder at the path, or null (nothing there, or a file) */
    folderAt(path: string): TFolder | null;
    metadataOf(file: TFile): CachedMetadata | null;
    /**
     * The note Obsidian counts as open: the current tab's, or the last one used while another kind of view (such as the
     * calendar) has the focus. The calendar's selection is this note (docs/state.md, ADR-S1)
     */
    activeFile(): TFile | null;
    /** Every Markdown file in the vault (for counting notes in the settings; the calendar looks notes up by path) */
    markdownFiles(): TFile[];
    /** Obsidian's core Daily notes plugin, whose settings the day notes follow while the plugin's own are off */
    dailyNotes(): DnPluginSettings | null;
};

type Schedule = (run: () => void) => void;

const nextFrame: Schedule = (run) => requestAnimationFrame(run);

/**
 * Calendared: call `onChange` once Obsidian reports anything the vault source's answers may depend on: a file or folder
 * created, renamed or deleted, a note's metadata changed, a note opened. Events within one frame make one call,
 * before the next paint. Returns a function that stops watching.
 */
export function watchVault(app: App, onChange: () => void, schedule: Schedule = nextFrame): () => void {
    let scheduled = false;
    let stopped = false;
    const notify = () => {
        if (scheduled) return;
        scheduled = true;
        schedule(() => {
            scheduled = false;
            if (!stopped) onChange();
        });
    };

    const refs: [{ offref(ref: EventRef): void }, EventRef][] = [
        [app.vault, app.vault.on("create", notify)],
        [app.vault, app.vault.on("delete", notify)],
        [app.vault, app.vault.on("rename", notify)],
        [app.metadataCache, app.metadataCache.on("changed", notify)],
        [app.workspace, app.workspace.on("file-open", notify)],
    ];
    return () => {
        stopped = true;
        refs.forEach(([events, ref]) => events.offref(ref));
    };
}

export function createVaultSource(app: App, schedule: Schedule = nextFrame): VaultSource {
    // watches Obsidian only while something on screen reads the source
    const subscribe = createSubscriber((update) =>
        watchVault(app, () => (import.meta.env.DEV ? measure(update) : update()), schedule),
    );

    return {
        fileAt(path) {
            subscribe();
            const file = app.vault.getAbstractFileByPath(path);
            return file instanceof TFile ? file : null;
        },
        folderAt(path) {
            subscribe();
            const folder = app.vault.getAbstractFileByPath(path);
            return folder instanceof TFolder ? folder : null;
        },
        metadataOf(file) {
            subscribe();
            return app.metadataCache.getFileCache(file);
        },
        activeFile() {
            subscribe();
            return app.workspace.getActiveFile();
        },
        markdownFiles() {
            subscribe();
            return app.vault.getMarkdownFiles();
        },
        dailyNotes() {
            subscribe();
            return app.internalPlugins?.getPluginById<DnPluginSettings>(DAILY_NOTES_PLUGIN_ID) ?? null;
        },
    };
}

/**
 * Calendared: development builds only (`DEPLOY_MODE=development npm run deploy`): log how long the
 * readers take to read again and redraw. ADR-S2 aims for one frame (about 16 ms); past that, the source would switch
 * to telling only the readers of a changed path
 */
function measure(update: () => void) {
    const start = performance.now();
    update();
    void tick().then(() => {
        const ms = performance.now() - start;
        // console.debug is hidden in the developer tools by default, and this runs in development builds only
        // eslint-disable-next-line no-console
        (ms > 16 ? console.warn : console.log)(`Calendared: re-read after a vault change in ${ms.toFixed(1)} ms`);
    });
}

let current: VaultSource | null = null;

/** Calendared: set up the vault source when the plugin loads (main.ts), before any view is drawn */
export function initVaultSource(app: App) {
    current = createVaultSource(app);
}

export function vaultSource(): VaultSource {
    if (!current) throw new Error("Calendared: the vault source is read before the plugin has loaded");
    return current;
}
