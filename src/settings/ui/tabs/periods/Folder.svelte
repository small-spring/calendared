<script lang="ts">
    import {
        getPeriodicityFromGranularity,
        type IGranularity,
    } from "@/io";
    import { validateFolder } from "@/io/validation";
    import { onDestroy, onMount } from "svelte";
    import { type PeriodSettings, FolderSuggest } from "@/settings";
    import { cn } from "@/ui/utils";
    import { type Writable } from "svelte/store";

    interface Props {
        settings: Writable<PeriodSettings>;
        granularity: IGranularity;
    }

    let { settings, granularity }: Props = $props();

    let inputEl: HTMLInputElement;
    let value: string = $state("");
    let error: string = $derived(validateFolder(value));
    let folderSuggestInstance: FolderSuggest;

    // Calendared: the file counts follow the folder by themselves (counted from the vault while shown);
    // upstream rebuilt the saved list of notes here, dropping the other periods' entries until a restart
    const handleInput = () => {
        $settings.folder = value.trim();
    };

    $effect.pre(() => {
        value = $settings.folder;
    });

    onMount(() => {
        folderSuggestInstance = new FolderSuggest(inputEl);
    });
    onDestroy(() => {
        folderSuggestInstance?.destroy();
    });
</script>

<div class="setting-item">
    <div class="setting-item-info">
        <div class="setting-item-name">Folder</div>
        <!-- Calendared: lowercase in the middle of the sentence (sentence case) -->
        <div class="setting-item-description">
            Where new {getPeriodicityFromGranularity(granularity)} notes are created.
        </div>
        <div
            class={cn(
                "setting-item-description",
                error ? "text-[var(--text-error)]" : "opacity-0",
            )}
        >
            {error || "Valid"}
        </div>
    </div>
    <div class="setting-item-control">
        <input
            class="flex-grow"
            bind:value
            bind:this={inputEl}
            class:has-error={!!error}
            type="text"
            spellcheck={false}
            placeholder="e.g. folder 1/folder 2"
            oninput={handleInput}
        />
    </div>
</div>
