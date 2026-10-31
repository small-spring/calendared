<script lang="ts">
    import { settingsStore } from "@/settings";
    import { notesWithFormatIn, type IGranularity } from "@/io";
    import { FilepathModal } from "@/ui/modals/filepath-select";
    import { cn } from "@/ui/utils";

    interface Props {
        granularity: IGranularity;
        format: string;
        error?: string;
        separator?: string;
    }

    let { granularity, format, error = "", separator = " • " }: Props = $props();

    // Calendared: counted from the vault while shown (docs/adr/0016); upstream kept the list in data.json
    let filepaths = $derived(notesWithFormatIn(granularity, format, $settingsStore));
    let filesCount = $derived(filepaths.length);

    function handleClick(e: MouseEvent) {
        e.preventDefault();
        new FilepathModal([...filepaths]).open();
    }
</script>

<!-- Calendared: "0 files" is shown too (as text, nothing to list), so a format that reads no note says so;
     upstream showed nothing. Lowercase "file(s)" (sentence case; upstream wrote "Files") -->
{#if format.trim()}
    {#if filesCount}
        <a
            class={cn(
                "[font-size:calc(var(--font-ui-small)+1px)] focus-visible:shadow-[0_0_0_3px_var(--background-modifier-border-focus)]",
                error ? "!text-[var(--text-error)] hover:opacity-85" : "u-pop",
            )}
            href={null}
            onclick={handleClick}
        >
            {filesCount}
            {filesCount === 1 ? "file" : "files"}
        </a>
    {:else}
        <span class={cn("[font-size:calc(var(--font-ui-small)+1px)]", error && "!text-[var(--text-error)]")}>0 files</span>
    {/if}
    {separator}
{/if}
