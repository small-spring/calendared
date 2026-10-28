<script lang="ts">
  import { IGranularity } from "@/io";

  import { getFileData } from "@/io";
  import {
    activeFileStore,
    displayedDateStore,
    todayStore,
    notesChangedStore,
  } from "@/stores/";
  import { cn, eventHandlers, isControlPressed } from "@/ui/utils";
  import { Button } from "@/ui/components/core";
  import Dot from "./Dot.svelte";
  import { getContext, Snippet } from "svelte";
  import { Sticker } from "..";
  import { Platform } from "obsidian";

  interface Props {
    // Properties
    date: moment.Moment;
    granularity: IGranularity;
    isActiveOverride?: boolean | null;
    displaySticker?: boolean;
    displayDot?: boolean;
    className?: string;
    dotContainerClassName?: string;
    children?: Snippet;
    text?: Snippet;
    ignoreAdjacentMonth?: boolean;
    /** Calendared: when set, a click calls this instead of opening the note */
    onSelect?: (() => void) | null;
  }

  let {
    date,
    granularity,
    displaySticker = true,
    displayDot = true,
    className = "",
    dotContainerClassName = "",
    children,
    text,
    ignoreAdjacentMonth = false,
    isActiveOverride = null,
    onSelect = null,
  }: Props = $props();

  let { file, sticker } = $derived.by(() => {
    $notesChangedStore; // file or sticker may have changed
    return getFileData(granularity, date);
  });
  let isActive = $derived.by(() => {
    if (!$activeFileStore?.file?.path || !file?.path) {
      return false;
    }

    return isActiveOverride ?? $activeFileStore.file.path === file.path;
  });

  let isToday = $derived(date.isSame($todayStore, granularity));
  let isAdjacentMonth = $state(false);

  $effect.pre(() => {
    if (ignoreAdjacentMonth) return;

    if (granularity === "day" && date && $displayedDateStore) {
      isAdjacentMonth = !date.isSame($displayedDateStore, "month");
    }
  });

  let minimalMode = getContext("minimalMode") as { value: boolean } | undefined;
</script>

<Button
  id={`${granularity}-bttn`}
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
      createNewSplitLeaf: isControlPressed(event),
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
      isControlPressed: isControlPressed(event),
      file,
    });
  }}
>
  {@render text?.()}
  <span id="date-text" class="relative">
    {#if displaySticker}
      <Sticker sticker={sticker?.emoji} />
    {/if}
    {@render children?.()}
  </span>
  {#if displayDot}
    <div class={cn("absolute leading-[0]", dotContainerClassName)}>
      <Dot
        className={cn((minimalMode?.value || Platform.isPhone) && "w-1")}
        isVisible={!!file}
        isFilled={!!file}
        {isActive}
      />
    </div>
  {/if}
</Button>
