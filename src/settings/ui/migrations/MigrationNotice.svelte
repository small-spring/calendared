<script lang="ts">
    // Calendared: under a changed format or sticker property, while notes still use the previous one (docs/adr/0035).
    // Stays until no note uses it or "Keep as is" is confirmed. The wording and look are provisional
    import { type IGranularity } from "@/io";
    import { countOf } from "@/utils";
    import { settingsStore } from "@/settings/store";
    import { confirmKeepAsIs, formatNoticeCount, openFormatRename, openStickerMove, stickerNoticeCount } from ".";

    interface Props {
        which: IGranularity | "sticker";
    }

    let { which }: Props = $props();

    let previous = $derived(
        which === "sticker" ? $settingsStore.migrationNotices.stickerProperty : $settingsStore.migrationNotices.formats[which],
    );
    // read from the vault while shown, so it follows renames and changed properties
    let count = $derived(previous ? (which === "sticker" ? stickerNoticeCount($settingsStore) : formatNoticeCount(which, $settingsStore)) : 0);
    const notes = (n: number) => countOf(n, "note");

    function migrate() {
        if (!previous) return;
        if (which === "sticker") openStickerMove(previous);
        else openFormatRename(which, previous);
    }
</script>

{#if previous && count > 0}
    <div class="calendared-migration-notice" role="status">
        <p class="m-0 [font-size:var(--font-ui-smaller)] text-[var(--text-warning)]">
            {#if which === "sticker"}
                {notes(count)} still {count === 1 ? "has its" : "have their"} sticker in "{previous}", so the calendar doesn't show
                {count === 1 ? "it" : "them"}.
            {:else}
                {notes(count)} {count === 1 ? "is" : "are"} still named in {previous}, so the calendar doesn't show
                {count === 1 ? "it" : "them"}.
            {/if}
        </p>
        <div class="flex flex-wrap gap-2 mt-1">
            <button class="mod-cta" onclick={migrate}>{which === "sticker" ? "Move stickers…" : "Rename…"}</button>
            <button onclick={() => confirmKeepAsIs(which, count)}>Keep as is</button>
        </div>
    </div>
{/if}
