<script lang="ts">
  import { cn } from "@/ui/utils";
  import { capitalize } from "@/utils";
  import Arrow from "./Arrow.svelte";
  import PeriodTitle, { type TTitle } from "./PeriodTitle.svelte";
  import { Snippet } from "svelte";
  import { setIcon } from "obsidian";

  interface Props {
    leftDate?: moment.Moment | null;
    leftTitle?: TTitle | null;

    rightDate?: moment.Moment | null;
    rightTitle?: TTitle | null;

    leftTitleSnippet?: Snippet;
    /** Calendared: content of the popover opened by the chevron next to the right title. Receives `close`. */
    picker?: Snippet<[() => void]>;

    /** Calendared: replaces upstream's `bottomNavSnippet` (DateNavigator) */
    nav: {
      type: string;
      showingCrrDate: boolean;
      decrement: () => void;
      increment: () => void;
      reset: () => void;
    };
  }
  let {
    leftDate = null,
    leftTitle = null,
    rightDate = null,
    rightTitle = null,
    leftTitleSnippet,
    picker,
    nav,
  }: Props = $props();

  let headerEl: HTMLDivElement | null = $state(null);
  let pickerToggleEl: HTMLButtonElement | null = $state(null);
  let resetEl: HTMLButtonElement | null = $state(null);
  let pickerOpen = $state(false);
  /** x of the popover's tip, centered under the chevron */
  let tipLeft = $state(0);
  const closePicker = () => (pickerOpen = false);

  $effect(() => {
    if (pickerToggleEl) {
      setIcon(pickerToggleEl, pickerOpen ? "chevron-up" : "chevron-down");
    }
  });

  // close on click outside the header (the popover lives inside it) or on Esc
  $effect(() => {
    if (!pickerOpen) return;

    if (pickerToggleEl) {
      tipLeft = pickerToggleEl.offsetLeft + pickerToggleEl.offsetWidth / 2;
    }
    const onPointerDown = (ev: PointerEvent) => {
      const target = ev.target as HTMLElement;
      if (!headerEl || headerEl.contains(target)) return;

      closePicker();
      // a click on the calendar that dismisses the popover shouldn't also open a note
      if (target.closest?.("#pnc-container")) {
        const swallowClick = (clickEv: MouseEvent) => {
          clickEv.preventDefault();
          clickEv.stopPropagation();
        };
        activeDocument.addEventListener("click", swallowClick, { capture: true, once: true });
        // drop it if no click follows (e.g. the pointer was dragged away)
        window.setTimeout(
          () => activeDocument.removeEventListener("click", swallowClick, { capture: true }),
          500,
        );
      }
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closePicker();
    };
    activeDocument.addEventListener("pointerdown", onPointerDown, true);
    activeDocument.addEventListener("keydown", onKeyDown);

    return () => {
      activeDocument.removeEventListener("pointerdown", onPointerDown, true);
      activeDocument.removeEventListener("keydown", onKeyDown);
    };
  });
  $effect(() => {
    if (resetEl) {
      setIcon(resetEl, "locate-fixed");
    }
  });
</script>

<!--
  Calendared: upstream laid this out as a big left title, a right title, and ‹ • › below.
  Now one row: [left title ‹ ›] [right title ⌄] ... [go to current]
  Title sizes follow upstream's minimal mode.
-->

<!-- items-end: arrows and icons sit on the titles' bottom line (titles reserve 8px below for the dot) -->
<div id="header" class="relative flex items-end gap-1 mt-4 mb-3" bind:this={headerEl}>
  {@render leftTitleSnippet?.()}
  {#if leftTitle && leftDate}
    <PeriodTitle
      date={leftDate}
      title={leftTitle}
      className="text-xl !text-[--color-text-header-title]"
    />
  {/if}

  <div class="flex items-end mb-[11px] -ml-0.5" id="nav-arrows">
    <Arrow
      direction="left"
      onClick={nav.decrement}
      tooltip={`Previous ${capitalize(nav.type)}`}
      className="!h-auto !py-0.5 !px-1 [&>svg]:w-1.5"
    />
    <Arrow
      direction="right"
      onClick={nav.increment}
      tooltip={`Next ${capitalize(nav.type)}`}
      className="!h-auto !py-0.5 !px-1 [&>svg]:w-1.5"
    />
  </div>

  {#if rightTitle && rightDate}
    <PeriodTitle
      date={rightDate}
      title={rightTitle}
      className="text-sm font-medium !text-[--interactive-accent] ml-4"
    />
  {/if}

  {#if picker}
    <button
      class={cn("clickable-icon mb-1.5 -ml-1.5", pickerOpen && "is-active")}
      id="picker-toggle"
      aria-label="Pick a month"
      aria-expanded={pickerOpen}
      onclick={() => (pickerOpen = !pickerOpen)}
      bind:this={pickerToggleEl}
    ></button>
  {/if}

  <!--
    Span exactly the calendar's last column so the icon is centered over it.
    `.pnc-calendar` is 2rem wider than this row and bleeds 1rem past each side.
  -->
  <div class="ml-auto -mr-4 mb-1.5 flex justify-center w-[calc((100%+2rem)/7)]">
    <button
      class={cn(
        "clickable-icon",
        nav.showingCrrDate && "opacity-30 !cursor-default",
      )}
      id="reset-button"
      aria-label={`Go to current ${nav.type}`}
      onclick={nav.reset}
      bind:this={resetEl}
    ></button>
  </div>

  {#if picker && pickerOpen}
    <div
      id="picker-popover"
      class="absolute left-0 right-0 top-full mt-1.5 z-[var(--layer-popover)] p-2 rounded-[--radius-m] bg-[--background-primary] [border:1px_solid_var(--background-modifier-border)] [box-shadow:var(--shadow-s)]"
    >
      <span
        class="absolute -top-[6px] w-[10px] h-[10px] rotate-45 bg-[--background-primary] [border-left:1px_solid_var(--background-modifier-border)] [border-top:1px_solid_var(--background-modifier-border)]"
        style={`left: ${tipLeft - 5}px`}
      ></span>
      {@render picker(closePicker)}
    </div>
  {/if}
</div>
