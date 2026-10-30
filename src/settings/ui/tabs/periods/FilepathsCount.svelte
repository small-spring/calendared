<script lang="ts">
    import {
        LoadingCircle,
        settingsStore,
        type PeriodSettings,
    } from "@/settings";
    import { notesWithFormatIn, type IGranularity } from "@/io";
    import { FilepathModal } from "@/ui/modals/filepath-select";
    import { cn } from "@/ui/utils";
    import { type Writable } from "svelte/store";

    interface Props {
        settings: Writable<PeriodSettings>;
        granularity: IGranularity;
        format: PeriodSettings["formats"][number];
        selected?: boolean;
        error?: string;
        separator?: string;
        /** Calendared: the notes to count instead of all the format reads (deleting a format counts only its own) */
        filepaths?: string[];
    }

    let {
        settings,
        granularity,
        format,
        selected = false,
        error = "",
        separator = " • ",
        filepaths: given,
    }: Props = $props();

    // Calendared: counted from the vault while shown (docs/adr/0016); upstream kept the list in data.json
    let filepaths = $derived(given ?? notesWithFormatIn(granularity, format.value, $settingsStore));
    let filesCount = $derived(filepaths.length);
    let _selected = $derived(selected);

    function handleClick(e: MouseEvent) {
        e.preventDefault();
        !format.loading &&
            new FilepathModal([...filepaths], settings, format).open();
    }
</script>

<!-- Calendared: "0 Files" is shown too (as text, nothing to list), so a format that reads no note says so;
     upstream showed nothing. Only an empty format (e.g. the row for adding one) shows no count -->
{#if format.value.trim() || format.loading}
    <div class="relative inline-flex">
        <LoadingCircle loading={format.loading} />
        {#if filesCount}
            <a
                class={cn(
                    "[font-size:calc(var(--font-ui-small)+1px)] focus-visible:shadow-[0_0_0_3px_var(--background-modifier-border-focus)]",
                    error
                        ? "!text-[var(--text-error)] hover:opacity-85"
                        : _selected
                          ? "opacity-100 hover:opacity-85 !text-[var(--text-on-accent)]"
                          : "u-pop",
                    format.loading && "opacity-60",
                )}
                href={null}
                onclick={handleClick}
            >
                {filesCount}
                {filesCount === 1 ? "File" : "Files"}
            </a>
        {:else}
            <span
                class={cn(
                    "[font-size:calc(var(--font-ui-small)+1px)]",
                    error && "!text-[var(--text-error)]",
                    format.loading && "opacity-60",
                )}>0 Files</span
            >
        {/if}
    </div>
    {separator}
{/if}
