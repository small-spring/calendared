<script lang="ts">
  import { fly } from "svelte/transition";

  import { TIMELINE_TYPE } from "@/constants";
  import { IGranularity } from "@/io";
  import { settingsStore, TimelineViewMode } from "@/settings";
  import { getFileData } from "@/io";
  import { localeSwitched, notesChangedStore } from "@/stores";
  import { Arrow } from "@/ui";
  import { cn } from "@/ui/utils";
  import { setIcon, Platform } from "obsidian";
  import { onDestroy, onMount } from "svelte";
  import DateBttn from "../core/DateBttn.svelte";
  import Dot from "../core/Dot.svelte";
  import PeriodTitle from "../core/PeriodTitle.svelte";
  import { G_MAP, VIEW_MODES } from "./constants";

  interface Props {
    granularity: IGranularity;
    initialDate: moment.Moment;
    isPeriodic?: boolean | null;
    isSide?: boolean | null;
    viewModeOverride?: TimelineViewMode | null;
  }
  const {
    granularity,
    initialDate,
    viewModeOverride = "collapsed",
    isPeriodic = null,
    isSide = null,
  }: Props = $props();
  let timelineEl: HTMLDivElement | null = $state(null);
  let arrowEl: HTMLButtonElement | null = $state(null);

  // Calendared: the timeline keeps its own navigation state, seeded from the note it was mounted for.
  // TimelineManager.restart() unmounts and mounts a new one for a different note, so the props never change here.
  // svelte-ignore state_referenced_locally
  let viewMode = $state(viewModeOverride);
  // svelte-ignore state_referenced_locally
  let derivedG = $state(granularity);
  $effect.pre(() => {
    if (!$settingsStore.timeline.granularityBased) {
      derivedG = "day";
    }
  });
  // svelte-ignore state_referenced_locally
  let derivedInitialDate = $state(initialDate);

  // svelte-ignore state_referenced_locally
  let crrDisplayedDate = $state(initialDate);
  $effect.pre(() => {
    $localeSwitched;
    // this is crucial, existing moment objects keep their existing locale, so we need to re-locale them
    crrDisplayedDate = crrDisplayedDate.locale(window.moment.locale());
  });
  // svelte-ignore state_referenced_locally
  let crrSelectedDate = $state(initialDate);
  let resetEl: HTMLButtonElement | null = $state(null);
  /**
   * Calendared: start of the week as the calendar shows it (setting `localeSettings.weekStartId`).
   * Upstream used moment's `startOf("week")`, i.e. the language's week start (Sunday in Japanese), so the timeline
   * and the calendar could disagree. moment's own week start is left alone: Obsidian and other plugins share it
   */
  function startOfCalendarWeek(date: moment.Moment): moment.Moment {
    const weekStartId = $settingsStore.localeSettings.weekStartId ?? date.localeData().firstDayOfWeek();
    return date.clone().startOf("day").subtract((date.day() - weekStartId + 7) % 7, "days");
  }

  let dates: moment.Moment[] = $derived.by(() => {
    $localeSwitched; // moment objects don't track the locale; rebuild when it changes

    let dates: moment.Moment[] = [];

    if (derivedG === "week") {
      function getWeeksInMonth() {
        const weeks = [];
        // little hack to avoid moment's weirdness
        const date = window.moment([
          crrDisplayedDate.year(),
          crrDisplayedDate.month(),
          1,
        ]);
        let startOfWeek = date.clone().startOf("week");
        const endOfMonth = date.clone().endOf("month");

        while (startOfWeek.isBefore(endOfMonth)) {
          weeks.push(startOfWeek.clone());
          startOfWeek = startOfWeek.add(1, "week");
        }

        return weeks;
      }

      dates = getWeeksInMonth();
      return dates;
    }

    let startOfDate: moment.Moment = crrDisplayedDate;
    if (derivedG === "year") {
      startOfDate = crrDisplayedDate.clone().subtract(2, "year");
    } else if (derivedG === "day") {
      startOfDate = startOfCalendarWeek(crrDisplayedDate);
    } else {
      startOfDate = crrDisplayedDate.clone().startOf(G_MAP[derivedG].group);
    }
    let dateIter = startOfDate.clone();
    for (let i = 0; i < G_MAP[derivedG].qtt; i++) {
      dates.push(dateIter.clone());
      dateIter = dateIter.add(1, derivedG);
    }

    return dates;
  });
  // Calendared: the period the heading names (e.g. Q3 for a monthly note's timeline) and its note
  let groupDate = $derived(
    derivedG === "day"
      ? startOfCalendarWeek(crrDisplayedDate)
      : crrDisplayedDate.clone().startOf(G_MAP[derivedG].group),
  );
  // Calendared: the heading names the period around the dates (W43 for days, Q4 for months, the month for weeks,
  // the year for quarters). A week or quarter heading is shown only when that period is enabled (as the calendar does
  // with its week column): without those notes you don't need it to know where you are. A month or year heading always
  // shows, since it tells you where you are; when its period is disabled it just isn't clickable (PeriodTitle).
  // A year timeline's heading is a range of years, not a note, so it always shows
  let showHeading = $derived.by(() => {
    const group = G_MAP[derivedG].group;
    if (derivedG === "year" || group === "month" || group === "year") return true;
    return $settingsStore.periods[group].enabled;
  });
  let headingText = $derived(
    derivedG === "day" ? `W${String(groupDate.week()).padStart(2, "0")}` : undefined,
  );
  let groupFileData = $derived.by(() => {
    $notesChangedStore; // recompute when notes change
    return getFileData(G_MAP[derivedG].group, groupDate);
  });

  let startOfDate = $derived(dates[0]);
  let endOfDate = $derived(dates[dates.length - 1]);

  /**
   * Calendared: where the shown dates are, always shown: the month for a week of days (with the year outside the
   * current year), the year for other granularities.
   * e.g. "9月", "9月–10月", "2025年12月–2026年1月", "2025". Months are formatted in Obsidian's language with Intl
   * (each end separately: Intl's formatRange switches to numbers like "2025/12～2026/01" across years in Japanese).
   * A year on its own is just its digits ("2025", not "2025年"): nothing to translate, and it fits the narrow timelines.
   */
  let contextUnit = $derived<"month" | "year">(derivedG === "day" ? "month" : "year");
  /** the label's parts: one month/year, or the two ends of a range ("9月", "10月"), each opening its own note */
  let contextParts = $derived.by((): { date: moment.Moment; text: string }[] => {
    $localeSwitched;
    if (!startOfDate || !endOfDate || derivedG === "year") return [];

    const today = window.moment();
    const unit = contextUnit;

    let start: string, end: string;
    if (unit === "year") {
      [start, end] = [String(startOfDate.year()), String(endOfDate.year())];
    } else {
      const showYear = !(startOfDate.isSame(today, "year") && endOfDate.isSame(today, "year"));
      const format = new Intl.DateTimeFormat(window.moment.locale(), {
        month: "long",
        ...(showYear && { year: "numeric" }),
      });
      [start, end] = [format.format(startOfDate.toDate()), format.format(endOfDate.toDate())];
    }
    const parts = [{ date: startOfDate.clone().startOf(unit), text: start }];
    if (!startOfDate.isSame(endOfDate, unit)) parts.push({ date: endOfDate.clone().startOf(unit), text: end });
    return parts;
  });
  let contextFileData = $derived.by(() => {
    $notesChangedStore; // recompute when notes change
    return contextParts.map(({ date }) => getFileData(contextUnit, date));
  });

  let isInitial = $derived(
    derivedInitialDate.isSame(crrDisplayedDate, derivedG),
  );
  let observer: ResizeObserver | null = $state(null);
  let prevParentWidth: number | null = $state(null);

  function modDisplayedDate(ev: MouseEvent, type: "subtract" | "add") {
    ev.stopPropagation();
    crrDisplayedDate = crrDisplayedDate
      .clone()
      [type](G_MAP[derivedG].mod, G_MAP[derivedG].group);
  }
  function handleResetDate(event: MouseEvent) {
    event.stopPropagation();
    crrDisplayedDate = derivedInitialDate;
    crrSelectedDate = derivedInitialDate;
    // Calendared: upstream also re-opened the note here; it's already open, so just move back to it
  }
  function handleSelectDate(d: moment.Moment) {
    crrSelectedDate = d;
  }
  function handleToggleViewMode() {
    const crrViewModeIndex = VIEW_MODES.findIndex((m) => m === viewMode);
    viewMode = VIEW_MODES[(crrViewModeIndex + 1) % VIEW_MODES.length];
  }

  $effect(() => {
    if (resetEl) {
      setIcon(resetEl, "locate-fixed");
    }
  });

  $effect.pre(() => {
    if (arrowEl) {
      setIcon(
        arrowEl,
        viewMode === "collapsed" ? "lucide-chevron-right" : "lucide-chevron-up",
      );
    }
  });

  onMount(() => {
    // check for enough room
    prevParentWidth =
      timelineEl?.parentElement?.getBoundingClientRect()?.width || 0;
    const cb = () => {
      const isParentActive =
        (timelineEl?.parentElement?.offsetHeight || 0) > 0 &&
        (timelineEl?.parentElement?.offsetWidth || 0) > 0;
      if (isParentActive) {
        const parentSize = timelineEl?.parentElement?.getBoundingClientRect();

        const enoughRoomInParent = (parentSize?.width || 0) > 640;

        if (prevParentWidth === null) {
          prevParentWidth = parentSize?.width || 0;
          return;
        }

        if (prevParentWidth < 660 && enoughRoomInParent) {
          viewMode = isPeriodic
            ? $settingsStore.timeline.viewMode
            : $settingsStore.timeline.restViewMode;
        } else if (prevParentWidth >= 620 && !enoughRoomInParent) {
          viewMode = enoughRoomInParent ? "expanded" : "collapsed";
        }
        prevParentWidth = parentSize?.width || 0;
      }
    };
    observer = new ResizeObserver(cb);
    timelineEl?.parentElement && observer.observe(timelineEl.parentElement);
  });

  onDestroy(() => {
    if (observer) {
      observer.disconnect();
    }
  });
</script>

<div id="pnc-container" data-type={TIMELINE_TYPE} bind:this={timelineEl}>
  <div
    id="timeline-container"
    class={cn(
      `timeline-container-${granularity}`,
      "absolute right-[26px] z-10 flex gap-[0.15rem] flex-col p-1 rounded-[var(--radius-s)]",
      // Calendared: wide enough for the footer (toggle, a 4-digit year, ‹ ›, ⌖) even on the narrow monthly timeline
      viewMode === "expanded" && "min-w-[9.5rem]",
      viewMode === "expanded" &&
        "[border-bottom:1px_solid_var(--divider-color)]",
      isSide
        ? Platform.isPhone
          ? "top-[26px] bg-[var(--mobile-sidebar-background)]"
          : "top-[26px] bg-[var(--background-secondary)]"
        : "top-[56px] bg-[var(--background-primary)]",
    )}
  >
    {#if viewMode === "expanded"}
      <div
        class={cn(
          "flex gap-1.5",
          derivedG === "year" ? "flex-col" : "flex-row",
        )}
        in:fly={{ x: 8 }}
        out:fly={{ x: 8 }}
      >
        {#if showHeading}
          <!--
            Calendared: a divider sets the heading (Q3, the year, the month) apart from the numbers next to it.
            The box copies the date buttons' metrics (padding, text-xs line, dot 0.2rem from the bottom), so the
            heading's text and its "note exists" dot sit on the same lines as theirs
          -->
          <div
            class={cn(
              "relative flex flex-col items-center text-center",
              derivedG === "year"
                ? "justify-center text-[0.7em] pt-0.5"
                : // pr-3.5: room for the heading's sticker, which sits past the top-right of the text (ADR-008)
                  "justify-end !pl-1.5 !pr-3.5 pt-1 pb-2.5 text-xs leading-4 [border-right:1px_solid_var(--background-modifier-border)]",
            )}
          >
            {#if derivedG === "year" && startOfDate && endOfDate}
              {startOfDate
                .clone()
                .format(G_MAP.year.titleFormat)}-{endOfDate.format(
                G_MAP.year.titleFormat,
              )}
            {:else}
              <!-- Calendared: the heading opens (or creates) its own note, like the calendar header's titles -->
              <PeriodTitle
                date={groupDate}
                title={{
                  granularity: G_MAP[derivedG].group,
                  fileData: groupFileData,
                  formatValue: G_MAP[derivedG].titleFormat,
                }}
                textClassName="font-normal text-[0.9em] leading-4"
                text={headingText}
                showDot={false}
                showSticker={$settingsStore.timeline.displayStickers}
              />
              <div class="absolute bottom-[.2rem] leading-[0]">
                <Dot isVisible={!!groupFileData.file} isFilled={!!groupFileData.file} />
              </div>
            {/if}
          </div>
        {/if}
        <!--
          Calendared: flex-1 justify-evenly spreads the dates over any width the minimum adds, with the same space
          before the first date as between dates, so the heading is never closer to the dates than they are to each other
        -->
        <div id="timeline-dates-list" class="flex gap-0.5 flex-1 justify-evenly">
          {#each dates as d}
            <div class="flex flex-col gap-0.5 text-center">
              {#if derivedG === "day"}
                <div
                  id="timeline-day-title"
                  class={cn(
                    "text-[0.7em] font-semibold tracking-[0.2px] text-[var(--text-muted)]",
                    d.isSame(crrSelectedDate, "day") &&
                      "text-[var(--text-normal)]",
                  )}
                >
                  {d.format(G_MAP[derivedG].titleFormat)}
                </div>
              {/if}
              <div
                tabindex="0"
                role="button"
                onclick={() => handleSelectDate(d)}
                onkeydown={() => handleSelectDate(d)}
              >
                <!-- Calendared: upstream hid the "note exists" dot here (displayDot={false}); shown like in the calendar -->
                <DateBttn
                  date={d}
                  granularity={derivedG}
                  isActiveOverride={d.isSame(crrSelectedDate, derivedG)}
                  displaySticker={$settingsStore.timeline.displayStickers}
                  className="!px-1.5 !pt-1 !pb-2.5 text-xs"
                  dotContainerClassName="bottom-[.2rem]"
                  ignoreAdjacentMonth={true}
                >
                  {d.format(G_MAP[derivedG].format)}
                </DateBttn>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    <div
      id="timeline-toggle-button"
      class={cn(
        "absolute flex justify-end items-center pl-1 transition-all duration-400 ease-out right-0",
        "rounded-[var(--radius-s)]",
        viewMode === "collapsed"
          ? "top-0 px-1.5 pl-1 py-[0.3rem]"
          : "top-[calc(100%+0.15rem)]",
        // Calendared: upstream used w-auto min-w-full, so a wider footer (e.g. with the year label) stuck out past the dates
        viewMode === "expanded" && "w-full",
        isSide
          ? Platform.isPhone
            ? "bg-[var(--mobile-sidebar-background)]"
            : "bg-[var(--background-secondary)]"
          : "bg-[var(--background-primary)]",
      )}
    >
      <!--
        Calendared: upstream made this whole strip the open/close button (any click on it, and any key while it had focus).
        Now only the chevron toggles, so the clickable area matches what it looks like.
      -->
      <!-- Calendared: upstream showed a relative date ("Today", "3 days ago") next to the chevron -->
      <div class="flex items-center gap-1 mr-auto min-w-0">
        <!-- -ml-1 offsets the button's padding so the chevron stays where it was -->
        <button
          class="clickable-icon !p-1 -ml-1 shrink-0 !text-[var(--text-accent)]"
          aria-label={viewMode === "collapsed" ? "Show timeline" : "Hide timeline"}
          aria-expanded={viewMode === "expanded"}
          onclick={handleToggleViewMode}
          bind:this={arrowEl}
        ></button>
        {#if viewMode === "expanded" && contextParts.length}
          <!-- Calendared: each month/year opens (or creates) its own note; a range shows both, joined by "–" -->
          <span class="ml-1 min-w-0 flex items-center [font-size:var(--font-smallest)] text-[var(--text-muted)]">
            {#each contextParts as part, i (part.text)}
              {#if i > 0}<span class="px-0.5">–</span>{/if}
              <PeriodTitle
                className="min-w-0"
                date={part.date}
                title={{ granularity: contextUnit, fileData: contextFileData[i], formatValue: "YYYY" }}
                text={part.text}
                textClassName="font-normal [font-size:var(--font-smallest)] !text-[var(--text-muted)]"
                showDot={false}
              />
            {/each}
          </span>
        {/if}
      </div>

      {#if viewMode === "expanded"}
        <!-- Calendared: upstream was ‹ • ›; now ‹ › stay together and ⌖ (back to the note's dates) sits apart, like the calendar header -->
        <div class="flex items-center ml-1 h-fit" id="bottom-nav">
          <Arrow
            direction="left"
            onClick={(ev) => {
              modDisplayedDate(ev, "subtract");
            }}
            tooltip={`Previous ${G_MAP[derivedG].group}`}
            className="!h-auto !py-0.5 !px-1 [&>svg]:w-1.5"
          />
          <Arrow
            direction="right"
            onClick={(ev) => modDisplayedDate(ev, "add")}
            tooltip={`Next ${G_MAP[derivedG].group}`}
            className="!h-auto !py-0.5 !px-1 [&>svg]:w-1.5"
          />
          <button
            class={cn(
              "clickable-icon ml-1",
              isInitial && "opacity-30 !cursor-default",
            )}
            id="reset-button"
            onclick={handleResetDate}
            aria-label={`Go to note's ${G_MAP[derivedG].group}`}
            bind:this={resetEl}
          ></button>
        </div>
      {/if}
    </div>
  </div>
</div>
