<script lang="ts">
  // Calendared: the breadcrumbs and the mini calendar above a note (docs/adr/0031, 0032). Replaces upstream's timeline
  import { Platform } from "obsidian";
  import { onDestroy } from "svelte";

  import { inLocale } from "@/calendar-locale";
  import { NAVIGATION_TYPE } from "@/constants";
  import { getPeriodicityFromGranularity, noteAt, type IGranularity } from "@/io";
  import {
    breadcrumbs,
    crumbText,
    finestEnabled,
    monthDayText,
    showsOn,
    stripDates,
  } from "@/navigation";
  import { periodStart } from "@/periods";
  import { periodRulesStore, settingsStore } from "@/settings";
  import { enabledPeriods } from "@/settings/period-switch";
  import { todayStore } from "@/stores";
  import { Arrow } from "@/ui";
  import { cn, eventHandlers, isControlPressed, noteButtonEvents, useIcon } from "@/ui/utils";
  import DateBttn from "../core/DateBttn.svelte";

  interface Props {
    isPeriodic: boolean;
    /** the note's period; null for a note that isn't a periodic note */
    granularity: IGranularity | null;
    date: moment.Moment | null;
    /** a tab in the left or right sidebar (on phones, a drawer) */
    isSide?: boolean;
  }
  const { isPeriodic, granularity, date, isSide = false }: Props = $props();

  let locale = $derived($settingsStore.localeSettings.localeOverride);
  let rules = $derived($periodRulesStore);
  let enabled = $derived(enabledPeriods($settingsStore.periods));

  let showCrumbs = $derived(
    showsOn($settingsStore.breadcrumbs, Platform.isPhone) &&
      (isPeriodic || $settingsStore.breadcrumbs.onOtherNotes),
  );
  let showMini = $derived(
    showsOn($settingsStore.miniCalendar, Platform.isPhone) &&
      (isPeriodic || $settingsStore.miniCalendar.onOtherNotes),
  );

  /** the note's period, or for another note where now is in the finest period in use (today, if days are used) */
  let center = $derived.by(() => {
    if (isPeriodic && granularity && date) return { granularity, date };
    const g = finestEnabled(enabled);
    return { granularity: g, date: periodStart(g, $todayStore, rules) };
  });

  /** how many times ‹ › moved the mini calendar away from the note (kept while the tab shows the same note) */
  let offset = $state(0);
  let dates = $derived(
    stripDates(center.granularity, center.date, offset, $settingsStore.miniCalendar.dayLayout, rules),
  );
  let centerStart = $derived(periodStart(center.granularity, center.date, rules));
  let isCenterShown = $derived(dates.some((d) => d.isSame(centerStart, "day")));
  let crumbs = $derived(breadcrumbs(center.granularity, center.date, enabled, rules));

  function open(event: MouseEvent, g: IGranularity, d: moment.Moment) {
    eventHandlers.onClick({ date: d, inNewTab: isControlPressed(event), granularity: g });
  }
  function cellText(g: IGranularity, d: moment.Moment) {
    return g === "day" ? inLocale(d, locale).format("D") : crumbText(g, d, locale, rules);
  }

  // ---- where it sits ----
  // phones: under Obsidian's header, which floats over the note; app.css places it and pushes the note down.
  // Desktop: a bar between the tab's header and its note (mounted there), or with "Compact on desktop" a small box at
  // the top right of the note. Tablets count as desktop: they keep the side calendar in view
  const isPhoneBar = Platform.isPhone && !isSide;
  /** the compact box (18.5rem, 26px from the right) takes at most the tab's right half; in a narrower tab (split side
   * by side) it would cover the note's title, so the bar shows instead */
  let isWide = $state(true);
  let compact = $derived(!Platform.isPhone && $settingsStore.compactOnDesktop && isWide);
  /** the mini calendar alone: its "back" button straddles the line under it, so the dates leave room above the line */
  let roomForBack = $derived(showMini && !showCrumbs);

  let rootEl: HTMLDivElement | null = $state(null);
  let leafEl: HTMLElement | null = null;

  $effect(() => {
    const tab = rootEl?.parentElement;
    if (Platform.isPhone || !tab) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const update = () => (isWide = tab.clientWidth >= 2 * (18.5 * rem + 26));
    const observer = new ResizeObserver(update);
    observer.observe(tab);
    update();
    return () => observer.disconnect();
  });
  $effect(() => {
    if (!isPhoneBar || !rootEl) return;
    leafEl = rootEl.parentElement;
    const root = rootEl;
    const update = () => leafEl?.style.setProperty("--calendared-nav-height", `${root.offsetHeight}px`);
    const observer = new ResizeObserver(update);
    observer.observe(root);
    update();
    return () => observer.disconnect();
  });
  onDestroy(() => leafEl?.style.removeProperty("--calendared-nav-height"));

</script>

{#if showCrumbs || showMini}
  <div
    bind:this={rootEl}
    data-type={NAVIGATION_TYPE}
    class={cn(
      "calendared-nav z-10",
      isPhoneBar
        ? "is-phone-bar absolute inset-x-0 bg-[var(--background-primary)] [border-bottom:1px_solid_var(--divider-color)]"
        : compact
          ? "is-compact absolute right-[26px] top-[calc(var(--header-height)+var(--size-4-2))] w-[18.5rem] max-w-[calc(100%-2.5rem)] rounded-[var(--radius-m)] bg-[var(--background-primary)] [border:1px_solid_var(--background-modifier-border)] shadow-[var(--shadow-s)]"
          : "relative flex-none [border-bottom:1px_solid_var(--divider-color)]",
    )}
  >
    <div
      class={cn(
        "mx-auto flex flex-col",
        compact ? "gap-0 px-1 pt-0.5 pb-0.5" : "gap-0.5 px-2 pt-1 pb-1",
        // phones: a little room under the floating header's buttons
        isPhoneBar && "pt-2",
        // the upper half of the "back" button sits here, below the dates rather than over them. On desktop the dates
        // also move up a little, away from it; on phones the header above is close enough already
        roomForBack && cn("pb-3", !isPhoneBar && "!pt-0"),
        !compact && !isPhoneBar && "max-w-[26rem]",
      )}
    >
      {#if showCrumbs}
        <div class="flex items-center">
          {#if !showMini && isPeriodic}
            <Arrow
              direction="left"
              tooltip={`Open previous ${getPeriodicityFromGranularity(center.granularity)} note`}
              onClick={(event) => open(event, center.granularity, centerStart.clone().subtract(1, center.granularity))}
              size="bar"
            />
          {/if}
          <nav
            aria-label="Breadcrumbs"
            class={cn(
              "flex flex-1 flex-wrap items-center justify-center gap-x-0.5 text-[var(--text-muted)]",
              compact ? "text-[0.7rem]" : "[font-size:var(--font-smallest)]",
            )}
          >
            {#each crumbs as crumb, i (crumb.granularity)}
              {@const isLast = i === crumbs.length - 1}
              {@const text = crumbText(crumb.granularity, crumb.date, locale, rules)}
              {#if i > 0}<span class="text-[var(--text-faint)]" aria-hidden="true">›</span>{/if}
              {#if isLast && isPeriodic}
                <!-- the note itself: brings a moved mini calendar back to it -->
                <button
                  class={cn(
                    "calendared-crumb !h-auto !px-1 !py-0 !shadow-none !bg-transparent font-semibold text-[var(--text-normal)]",
                    offset !== 0 && "!text-[var(--text-accent)] underline underline-offset-2",
                  )}
                  aria-label={offset !== 0 ? "Move the mini calendar back to this note" : undefined}
                  onclick={() => (offset = 0)}>{text}</button
                >
              {:else if crumb.canOpen}
                {@const events = noteButtonEvents(crumb.granularity, crumb.date, noteAt(crumb.granularity, crumb.date, $settingsStore))}
                <button
                  class={cn(
                    "calendared-crumb !h-auto !px-1 !py-0 !shadow-none !bg-transparent text-[var(--text-muted)] hover:!text-[var(--text-normal)] hover:!bg-[var(--background-modifier-hover)]",
                    isLast && offset !== 0 && "!text-[var(--text-accent)] underline underline-offset-2",
                  )}
                  aria-label={`Open ${getPeriodicityFromGranularity(crumb.granularity)} note`}
                  onclick={(event) => {
                    // another note: its rightmost crumb (now) first brings a moved mini calendar back, then opens
                    if (isLast && offset !== 0) offset = 0;
                    else events.open(event);
                  }}
                  oncontextmenu={(event) => events.menu(event)}
                  onpointerenter={(event) => events.hover(event)}
                  >{text}</button
                >
              {:else}
                <span class="px-1">{text}</span>
              {/if}
            {/each}
          </nav>
          {#if !showMini && isPeriodic}
            <Arrow
              direction="right"
              tooltip={`Open next ${getPeriodicityFromGranularity(center.granularity)} note`}
              onClick={(event) => open(event, center.granularity, centerStart.clone().add(1, center.granularity))}
              size="bar"
            />
          {/if}
        </div>
      {/if}

      {#if showMini}
        <div class="flex items-center">
          <Arrow
            direction="left"
            tooltip="Previous"
            onClick={(event) => {
              event.stopPropagation();
              offset -= 1;
            }}
            size="bar"
          />
          <!-- equal columns, so a two-digit date doesn't make its column wider than the others -->
          <div
            class="grid flex-1 gap-0.5 min-w-0"
            style={`grid-template-columns: repeat(${dates.length}, minmax(0, 1fr));`}
          >
            {#each dates as d (d.valueOf())}
              <div class="flex flex-col items-center gap-0.5 text-center">
                {#if center.granularity === "day"}
                  <div
                    class={cn(
                      "font-semibold tracking-[0.2px] text-[var(--text-muted)]",
                      compact ? "text-[0.6rem]" : "text-[0.7em]",
                    )}
                  >
                    {inLocale(d, locale).format("ddd")}
                  </div>
                {/if}
                <DateBttn
                  date={d}
                  granularity={center.granularity}
                  displaySticker={$settingsStore.miniCalendar.displayStickers}
                  className={cn("!pt-1 text-xs", compact ? "!px-1 !pb-2" : "!px-1.5 !pb-2.5")}
                  dotContainerClassName="bottom-[.2rem]"
                  ignoreAdjacentMonth={true}
                >
                  {cellText(center.granularity, d)}
                </DateBttn>
              </div>
            {/each}
          </div>
          <Arrow
            direction="right"
            tooltip="Next"
            onClick={(event) => {
              event.stopPropagation();
              offset += 1;
            }}
            size="bar"
          />
        </div>
      {/if}
    </div>

    {#if showMini && !showCrumbs && !isCenterShown}
      <!-- straddles the line under the mini calendar, so ‹ › stay where they are while it shows. Placed without
           Tailwind's translate classes: their variables have no defaults here (no preflight), so they do nothing -->
      <div class="pointer-events-none absolute inset-x-0 top-full z-10 -mt-[0.6rem] flex justify-center">
        <button
          class="calendared-nav-back pointer-events-auto flex items-center gap-1 !h-auto !rounded-full !px-2.5 !py-0.5 text-[0.7rem] !text-[var(--text-accent)] !bg-[var(--background-primary)] [border:1px_solid_var(--background-modifier-border)] shadow-[var(--shadow-s)]"
          aria-label="Move the mini calendar back to this note"
          onclick={() => (offset = 0)}
        >
          <span use:useIcon={"rotate-ccw"} class="flex [&>svg]:w-3 [&>svg]:h-3"></span>
          {center.granularity === "day"
            ? monthDayText(center.date, locale)
            : crumbText(center.granularity, center.date, locale, rules)}
        </button>
      </div>
    {/if}
  </div>
{/if}
