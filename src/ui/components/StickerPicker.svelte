<script lang="ts">
    import { STICKER_PICKER_ID } from "@/constants";
    import { cn, initializePicker, removeSticker, useIcon } from "../utils";
    import { themeStore, stickerPickerNoteStore } from "@/stores";
    import { Platform } from "obsidian";

    let { close }: { close: () => void } = $props();

    let pickerContainerEl: HTMLDivElement | null = $state(null);
    $effect(() => {
        if (pickerContainerEl && $themeStore && $stickerPickerNoteStore) {
            initializePicker(pickerContainerEl, $themeStore, $stickerPickerNoteStore);
        }
    });

    // Calendared: lets you take a sticker off from the same place you put it on
    const handleRemove = async () => {
        const file = $stickerPickerNoteStore?.file;
        close();
        if (file) await removeSticker(file);
    };
    // Calendared: ↓ on the remove button goes back to the search box below it (↑ there comes here, see onInputKeydown)
    const handleRemoveKeydown = (event: KeyboardEvent) => {
        if (event.key !== "ArrowDown") return;
        event.preventDefault();
        pickerContainerEl?.querySelector("em-emoji-picker")?.shadowRoot?.querySelector("input")?.focus();
    };
</script>

<div
    class={cn(
        "pnc-sticker-picker bg-transparent w-max opacity-0 pointer-events-none absolute",
        Platform.isPhone
            ? // Calendared: below the status bar (Dynamic Island); upstream's top-0 hid the remove button under it
              "!top-[calc(var(--safe-area-inset-top,0px)+var(--size-4-2))] !left-1/2 [transform:translateX(-50%)_!important]"
            : " top-0 left-0",
    )}
    id={STICKER_PICKER_ID}
>
    <!--
        Calendared: one box holding the current sticker row and the picker, styled like an Obsidian popover.
        The picker drops its own frame and takes this background (see initializePicker), so they read as one.
    -->
    <div
        class="overflow-hidden rounded-[--radius-l] bg-[--background-primary] [border:1px_solid_var(--background-modifier-border)] [box-shadow:var(--shadow-s)]"
    >
        <!-- the current sticker and a way to take it off, at the top but low-key (docs/adr/0006). Icons only: no text to translate -->
        {#if $stickerPickerNoteStore?.sticker}
            <div
                class="flex items-center justify-between px-3 py-1.5 [border-bottom:1px_solid_var(--background-modifier-border)]"
            >
                <span class="text-xl leading-none" aria-label="Current sticker"
                    >{$stickerPickerNoteStore.sticker.emoji}</span
                >
                <button
                    class="pnc-sticker-remove clickable-icon"
                    aria-label="Remove sticker"
                    onclick={handleRemove}
                    onkeydown={handleRemoveKeydown}
                    use:useIcon={"trash-2"}
                ></button>
            </div>
        {/if}
        <!-- the picker gets its own box, since initializePicker replaces this box's child -->
        <div bind:this={pickerContainerEl}></div>
    </div>
</div>

<style lang="postcss">
    /* Obsidian's warning style (as on its warning menu items): red icon, red background with light icon on hover */
    .pnc-sticker-remove {
        color: var(--text-error);
    }
    /* Calendared: the same look when reached with the keyboard (Shift+Tab from the search box) */
    .pnc-sticker-remove:hover,
    .pnc-sticker-remove:focus-visible {
        color: var(--text-on-accent);
        background-color: var(--background-modifier-error);
    }
</style>
