<script lang="ts" module>
  import type { IGranularity, TFileData } from "@/io";

  export type TTitle = {
    className?: string;
    granularity: IGranularity;
    fileData: TFileData;
    formatValue: string;
    /** every label this title can show (e.g. all month names); the title is sized to the widest so nothing next to it shifts */
    widthSamples?: string[];
  };
</script>

<script lang="ts">
  // Calendared: a period title (e.g. "10月", "2026") that opens or creates that period's note.
  // Used by the header and the month picker so every title follows the same rules.
  import { getPeriodicityFromGranularity } from "@/io";
  import { settingsStore } from "@/settings";
  import { vaultSource } from "@/io";
  import { cn, eventHandlers, isControlPressed } from "@/ui/utils";
  import { capitalize } from "@/utils";
  import { inLocale } from "@/calendar-locale";
  import Button from "./Button.svelte";
  import Dot from "./Dot.svelte";
  import Sticker from "../Sticker.svelte";

  interface Props {
    date: moment.Moment;
    title: TTitle;
    /** layout classes for the outer box (e.g. margins) */
    className?: string;
    /** font size/weight/color classes; applied to the label and to the width samples so they measure the same */
    textClassName?: string;
    /** called after the title is clicked */
    onOpen?: () => void;
    /** show the "note exists" dot under the label (off where there's no room, e.g. the timeline heading) */
    showDot?: boolean;
    /** text to show instead of `date.format(title.formatValue)` (e.g. a month name formatted with Intl) */
    text?: string;
    /** show the note's sticker at the top-right of the label, like on the date buttons (see docs/adr/0008) */
    showSticker?: boolean;
  }
  let {
    date,
    title,
    className = "",
    textClassName = "",
    onOpen,
    showDot = true,
    text,
    showSticker = false,
  }: Props = $props();

  let periodicity = $derived(getPeriodicityFromGranularity(title.granularity));
  // a disabled period can't create its note (see createOrOpenNote), so only look clickable if it exists
  let canOpen = $derived(
    !!title.fileData.file || $settingsStore.periods[title.granularity].enabled,
  );
  // the open note looks selected wherever it shows up on the calendar, like the date buttons.
  // The background is drawn with a shadow so the selected title keeps its size and nothing shifts
  // Calendared: the open note as Obsidian knows it (docs/adr/0015)
  let isActive = $derived(
    !!title.fileData.file &&
      vaultSource().activeFile()?.path === title.fileData.file.path,
  );
</script>

<!--
  The invisible samples share one grid cell with the title, so the cell is as wide as the widest label.
  The title stays left-aligned with its dot centered under the visible text.
-->
<div class={cn("grid font-semibold tabular-nums", textClassName, className)}>
  {#each title.widthSamples ?? [] as sample}
    <span class="invisible [grid-area:1/1]" aria-hidden="true">{sample}</span>
  {/each}
  <div class="[grid-area:1/1] justify-self-start flex flex-col items-center">
    <Button
      class={cn(
        "h-auto font-semibold tabular-nums hover:!shadow-[0px_0px_0_5px_var(--interactive-hover)] rounded-[2px] !p-0",
        textClassName,
        title.className,
        !canOpen && "!cursor-default hover:!shadow-none hover:!bg-transparent",
        isActive &&
          "!text-[--text-on-accent] !bg-[--interactive-accent] !shadow-[0px_0px_0_5px_var(--interactive-accent)] hover:!bg-[--interactive-accent-hover] hover:!shadow-[0px_0px_0_5px_var(--interactive-accent-hover)]",
      )}
      id={title.granularity}
      aria-label={canOpen
        ? `Open ${periodicity} note`
        : `${capitalize(periodicity)} notes are turned off in settings`}
      onclick={(event) => {
        eventHandlers.onClick({
          date,
          createNewSplitLeaf: isControlPressed(event),
          granularity: title.granularity,
        });
        onOpen?.();
      }}
      oncontextmenu={(event) =>
        eventHandlers.onContextMenu({
          event,
          fileData: title.fileData,
          date,
          granularity: title.granularity,
        })}
      onpointerenter={(event) => {
        eventHandlers.onHover({
          event,
          file: title.fileData.file,
        });
      }}
    >
      <span class="relative">
        {text ?? inLocale(date, $settingsStore.localeSettings.localeOverride).format(title.formatValue)}
        {#if showSticker && title.fileData.sticker}
          <!-- the emoji keeps the date buttons' small size, whatever the title's size -->
          <span class="text-xs font-normal"><Sticker sticker={title.fileData.sticker.emoji} /></span>
        {/if}
      </span>
    </Button>
    {#if showDot}
      <div class="h-[8px] leading-[0]">
        <Dot
          className="w-1"
          isVisible={!!title.fileData.file}
          isFilled={!!title.fileData.file}
        />
      </div>
    {/if}
  </div>
</div>
