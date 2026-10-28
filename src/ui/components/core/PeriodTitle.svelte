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
  import { cn, eventHandlers, isControlPressed } from "@/ui/utils";
  import { capitalize } from "@/utils";
  import Button from "./Button.svelte";
  import Dot from "./Dot.svelte";

  interface Props {
    date: moment.Moment;
    title: TTitle;
    /** font size/color classes; also applied to the width samples so they measure the same */
    className?: string;
    /** called after the title is clicked */
    onOpen?: () => void;
  }
  let { date, title, className = "", onOpen }: Props = $props();

  let periodicity = $derived(getPeriodicityFromGranularity(title.granularity));
  // a disabled period can't create its note (see createOrOpenNote), so only look clickable if it exists
  let canOpen = $derived(
    !!title.fileData.file || $settingsStore.periods[title.granularity].enabled,
  );
</script>

<!--
  The invisible samples share one grid cell with the title, so the cell is as wide as the widest label.
  The title stays left-aligned with its dot centered under the visible text.
-->
<div class={cn("grid font-semibold tabular-nums", className)}>
  {#each title.widthSamples ?? [] as sample}
    <span class="invisible [grid-area:1/1]" aria-hidden="true">{sample}</span>
  {/each}
  <div class="[grid-area:1/1] justify-self-start flex flex-col items-center">
    <Button
      class={cn(
        "h-auto font-semibold tabular-nums hover:!shadow-[0px_0px_0_5px_var(--interactive-hover)] rounded-[2px] !p-0",
        className,
        title.className,
        !canOpen && "!cursor-default hover:!shadow-none hover:!bg-transparent",
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
          isControlPressed: isControlPressed(event),
          file: title.fileData.file,
        });
      }}
    >
      {date.format(title.formatValue)}
    </Button>
    <div class="h-[8px] leading-[0]">
      <Dot
        className="w-1"
        isVisible={!!title.fileData.file}
        isFilled={!!title.fileData.file}
      />
    </div>
  </div>
</div>
