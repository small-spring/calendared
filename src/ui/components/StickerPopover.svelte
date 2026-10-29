<script lang="ts">
    import { STICKER_POPOVER_ID } from "@/constants";
    import { cn, initializePicker, removeSticker } from "../utils";
    import { themeStore, spFileDataStore } from "@/stores";
    import { Popover } from "@/ui/popovers";
    import { Platform, setIcon } from "obsidian";

    let pickerContainerEl: HTMLDivElement | null = $state(null);
    $effect(() => {
        if (pickerContainerEl && $themeStore && $spFileDataStore) {
            initializePicker(pickerContainerEl, $themeStore, $spFileDataStore);
        }
    });

    // Calendared: lets you take a sticker off from the same place you put it on
    const handleRemove = async () => {
        const file = $spFileDataStore?.file;
        Popover.stickerSingleton?.close();
        if (file) await removeSticker(file);
    };
    let removeEl: HTMLButtonElement | null = $state(null);
    $effect(() => {
        if (removeEl) setIcon(removeEl, "trash-2");
    });
</script>

<div
    class={cn(
        "bg-transparent w-max opacity-0 pointer-events-none absolute",
        Platform.isPhone
            ? // Calendared: below the status bar (Dynamic Island); upstream's top-0 hid the remove button under it
              "!top-[calc(var(--safe-area-inset-top,0px)+var(--size-4-2))] !left-1/2 [transform:translateX(-50%)_!important]"
            : " top-0 left-0",
    )}
    data-popover={true}
    id={STICKER_POPOVER_ID}
>
    <!--
        Calendared: one box holding the current sticker row and the picker, styled like an Obsidian popover.
        The picker drops its own frame and takes this background (see initializePicker), so they read as one.
    -->
    <div
        class="overflow-hidden rounded-[--radius-l] bg-[--background-primary] [border:1px_solid_var(--background-modifier-border)] [box-shadow:var(--shadow-s)]"
    >
        <!-- the current sticker and a way to take it off, at the top but low-key (ADR-006). Icons only: no text to translate -->
        {#if $spFileDataStore?.sticker}
            <div
                class="flex items-center justify-between px-3 py-1.5 [border-bottom:1px_solid_var(--background-modifier-border)]"
            >
                <span class="text-xl leading-none" aria-label="Current sticker"
                    >{$spFileDataStore.sticker.emoji}</span
                >
                <button
                    class="pnc-sticker-remove clickable-icon"
                    aria-label="Remove sticker"
                    onclick={handleRemove}
                    bind:this={removeEl}
                ></button>
            </div>
        {/if}
        <!-- the picker gets its own box, since initializePicker replaces this box's child -->
        <div bind:this={pickerContainerEl}></div>
    </div>
</div>

<style lang="postcss">
    #emoji-modal {
        padding: 0px;
        min-width: unset;
        width: unset !important;
    }
    /* Obsidian's warning style (as on its warning menu items): red icon, red background with light icon on hover */
    .pnc-sticker-remove {
        color: var(--text-error);
    }
    .pnc-sticker-remove:hover {
        color: var(--text-on-accent);
        background-color: var(--background-modifier-error);
    }
</style>
