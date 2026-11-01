<script lang="ts">
  import { type IGranularity } from "@/io";

  import { noteAt, vaultSource } from "@/io";
  import { periodRulesStore, settingsStore } from "@/settings";
  import {
    displayedDateStore,
    todayStore,
  } from "@/stores/";
  import { cn, eventHandlers, isControlPressed } from "@/ui/utils";
  import { Button } from "@/ui/components/core";
  import Dot from "./Dot.svelte";
  import type { Snippet } from "svelte";
  import { Sticker } from "..";
  import { Platform } from "obsidian";
  import { samePeriod } from "@/periods";
  interface Props {
    // Properties
    date: moment.Moment;
    granularity: IGranularity;
    displaySticker?: boolean;
    className?: string;
    dotContainerClassName?: string;
    children?: Snippet;
    ignoreAdjacentMonth?: boolean;
    /** Calendared: when set, a click calls this instead of opening the note */
    onSelect?: (() => void) | null;
    /** Calendared: the calendar's smaller dot */
    compactDot?: boolean;
  }

  let {
    date,
    granularity,
    displaySticker = true,
    className = "",
    dotContainerClassName = "",
    children,
    ignoreAdjacentMonth = false,
    onSelect = null,
    compactDot = false,
  }: Props = $props();

  // Calendared: read through the vault source, with the settings read reactively (docs/adr/0016);
  // upstream re-read everything on a store emitting a random number
  let { file, sticker } = $derived(noteAt(granularity, date, $settingsStore));
  // Calendared: selected when its note is the open one, read from Obsidian (docs/adr/0015); upstream kept the
  // selection in a store that several places wrote, which could drift from the open note
  let isActive = $derived.by(() => {
    const openFile = vaultSource().activeFile();
    if (!openFile || !file) {
      return false;
    }

    return openFile.path === file.path;
  });

  // Calendared: a quarter or year by its own start month (docs/adr/0039)
  let isToday = $derived(samePeriod(granularity, date, $todayStore, $periodRulesStore));
  let isAdjacentMonth = $derived(
    !ignoreAdjacentMonth && granularity === "day" && !date.isSame($displayedDateStore, "month"),
  );
</script>

<Button
  class={cn(
    "date-bttn",
    "relative !h-auto w-full flex flex-col font-medium rounded-[--radius-s] tabular-nums transition-colors text-center",
    isActive
      ? "isActive !text-[--text-on-accent] !bg-[--interactive-accent] hover:!bg-[--interactive-accent-hover]"
      : isToday
        ? "!text-[--color-text-today]"
        : isAdjacentMonth
          ? "opacity-25"
          : "",
    isActive && isToday && "!text-[--text-on-accent]",
    // Calendared: today's (this week's, this month's...) button is bold, since its accent color alone looks dim and thin
    isToday && "!font-bold",
    className,
  )}
  style={`
        background-color: var(--color-background-${granularity}-bttn);
        color: var(--color-text-${granularity}-bttn);
    `}
  onclick={(event) => {
    if (onSelect) {
      onSelect();
      return;
    }
    eventHandlers.onClick({
      date,
      inNewTab: isControlPressed(event),
      granularity,
    });
  }}
  oncontextmenu={(event) =>
    eventHandlers.onContextMenu({
      event,
      fileData: {
        file,
        sticker,
      },
      date,
      granularity,
    })}
  onpointerenter={(event) => {
    eventHandlers.onHover({
      event,
      file,
    });
  }}
>
  <span class="relative">
    {#if displaySticker}
      <Sticker sticker={sticker?.emoji} />
    {/if}
    {@render children?.()}
  </span>
  <div class={cn("absolute leading-[0]", dotContainerClassName)}>
    <Dot
      className={cn((compactDot || Platform.isPhone) && "w-1")}
      isVisible={!!file}
      {isActive}
    />
  </div>
</Button>
