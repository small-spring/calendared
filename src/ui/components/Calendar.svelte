<script lang="ts">
    import { monthsIndexesInQuarters } from "@/constants";
    import { type IGranularity } from "@/io";
    import { displayedDateStore, localeDataStore, yearsRanges } from "@/stores";
    import {
        crrTabStore,
        getEnabledPeriods,
        periodTabs,
    } from "@/stores/calendar";
    import { onMount } from "svelte";
    import {
        cn,
        getStartOfWeek,
        getYears,
        isWeekend,
    } from "../utils";
    import MonthHeader from "./MonthHeader.svelte";
    import YearHeader from "./YearHeader.svelte";
    import YearsHeader from "./YearsHeader.svelte";
    import DateBttn from "./core/DateBttn.svelte";
    import { settingsStore } from "@/settings";
    import { weekSchemeFor } from "@/weeks";
    import { inLocale, monthGrid } from "@/calendar-locale";
    import { noteAt, vaultSource } from "@/io";

    let { weekdaysShort } = $derived($localeDataStore);
    // Calendared: also rebuild when the week start changes (upstream only did on month changes, so the dates
    // stayed in the old order under the new weekday header)
    let month = $derived(monthGrid($displayedDateStore, $settingsStore.localeSettings.weekStartId));
    // Calendared: names and numbers in the calendar's language, without switching Obsidian's moment (calendar-locale.ts)
    let locale = $derived($settingsStore.localeSettings.localeOverride);
    let weeks = $derived(weekSchemeFor($settingsStore.localeSettings));

    let crrTab = $derived($crrTabStore);
    let tabs: typeof periodTabs = $state(periodTabs);
    let enabledPeriods: Record<IGranularity, boolean> = $state(
        {} as Record<IGranularity, boolean>,
    );
    let containerEl: HTMLDivElement | null = $state(null);

    // Calendared: the row whose weekly note is the open note, read from Obsidian like the date buttons
    const isOpenWeek = (days: moment.Moment[]) => {
        const file = noteAt("week", getStartOfWeek(days), $settingsStore).file;
        return !!file && vaultSource().activeFile()?.path === file.path;
    };

    $effect.pre(() => {
        const enabledPeriodsRes = getEnabledPeriods($settingsStore.periods);
        enabledPeriods = enabledPeriodsRes.enabledPeriods;
        tabs = enabledPeriodsRes.tabs;
    });

    $effect.pre(() => {
        if (!tabs.includes(crrTab)) {
            const newTab = tabs[0];
            if (newTab !== crrTab) {
                crrTabStore.set(newTab);
            }
        }
    });

    onMount(() => {
        if (containerEl?.parentElement) {
            containerEl.parentElement.id = "pnc-calendar-parent";
        }
    });
</script>

<div id="pnc-container" class="px-4 !pt-2" bind:this={containerEl}>
    <!--
        Calendared: upstream showed Day/Month/Year tabs here. The calendar now stays on the day view and
        months are picked from the header popover (MonthPicker). The month/year views below are only
        reached when the day view (or the month view) isn't shown: days and weeks (or months and quarters) are both off.
    -->

    {#if crrTab === "day" && tabs.includes("day")}
        <MonthHeader />
        <table class="pnc-calendar">
            <colgroup>
                {#if enabledPeriods.week}
                    <col />
                {/if}
                {#each month[1].days as date}
                    <col class:weekend={isWeekend(date)} />
                {/each}
            </colgroup>
            <thead>
                <tr>
                    {#if enabledPeriods.week}
                        <th>W</th>
                    {/if}
                    {#each weekdaysShort as dayOfWeek}
                        <th>{dayOfWeek}</th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each month as week (week.days[0].format("YYYY-MM-DD"))}
                    <tr
                        class:pnc-week-row={enabledPeriods.week}
                        class:is-open-week={enabledPeriods.week &&
                            isOpenWeek(week.days)}
                    >
                        {#if enabledPeriods.week}
                            <td
                                class="[border-right:1px_solid_var(--background-modifier-border)] pr-1"
                            >
                                <DateBttn
                                    compactDot
                                    date={getStartOfWeek(week.days)}
                                    granularity="week"
                                    className={cn(
                                        "px-1 !pt-2.5 !pb-4 opacity-85 mx-auto",
                                        "[font-size:var(--font-ui-smaller)] ",
                                    )}
                                    dotContainerClassName={"bottom-[.3rem]"}
                                >
                                    <!-- Calendared: the week scheme's number (ISO week of the row's Monday, docs/spec/periods.md);
                                         upstream showed moment's language week number -->
                                    {String(weeks.weekOf(getStartOfWeek(week.days)).week).padStart(2, "0")}
                                </DateBttn>
                            </td>
                        {/if}
                        {#each week.days as day (day.format())}
                            <td
                                class={cn(
                                    enabledPeriods.week &&
                                        "[&:nth-child(2)]:pl-1",
                                )}
                            >
                                <DateBttn
                                    compactDot
                                    date={day}
                                    granularity="day"
                                    className={cn(
                                        "px-1 !pt-2.5 !pb-4",
                                        "text-xs",
                                    )}
                                    dotContainerClassName={"bottom-[.3rem]"}
                                >
                                    {inLocale(day, locale).format("D")}
                                </DateBttn>
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
    {#if crrTab === "month" && tabs.includes("month")}
        <YearHeader />
        <table class="pnc-calendar">
            <tbody>
                {#each monthsIndexesInQuarters as quarterMonthsIndexes, i}
                    <tr>
                        {#if enabledPeriods.quarter}
                            <td>
                                <DateBttn
                                    compactDot
                                    date={$displayedDateStore
                                        .clone()
                                        .quarter(i + 1)
                                        .startOf("quarter")}
                                    granularity="quarter"
                                    className={cn(
                                        "px-1 !pt-2.5 !pb-4 opacity-85",
                                        "[font-size:var(--font-ui-smaller)]",
                                    )}
                                    dotContainerClassName={"bottom-[.3rem]"}
                                >
                                    Q{$displayedDateStore
                                        .clone()
                                        .quarter(i + 1)
                                        .startOf("quarter")
                                        .quarter()}
                                </DateBttn>
                            </td>
                        {/if}
                        {#each quarterMonthsIndexes as monthIndex}
                            <td>
                                <DateBttn
                                    compactDot
                                    date={$displayedDateStore
                                        .clone()
                                        .month(monthIndex)
                                        .startOf("month")}
                                    granularity="month"
                                    onSelect={tabs.includes("day")
                                        ? () => {
                                              displayedDateStore.set(
                                                  $displayedDateStore
                                                      .clone()
                                                      .month(monthIndex)
                                                      .startOf("month"),
                                              );
                                              crrTabStore.set("day");
                                          }
                                        : null}
                                    className={cn(
                                        "px-1 mb-3 items-center justify-center",
                                        "text-sm !pt-2.5 !pb-4",
                                    )}
                                    dotContainerClassName={cn(
                                        "[transform:translateY(100%)]",
                                        "bottom-[calc(1rem/2)]",
                                    )}
                                >
                                    {inLocale($displayedDateStore, locale)
                                        .month(monthIndex)
                                        .format("MMM")}
                                </DateBttn>
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
    {#if crrTab === "year" && tabs.includes("year")}
        <YearsHeader />
        <table class="pnc-calendar">
            <tbody>
                {#each getYears( { startRangeYear: +$yearsRanges.ranges[$yearsRanges.crrRangeIndex].split("-")[0] }, ) as rowYearsRange}
                    <tr>
                        {#each rowYearsRange as year}
                            <td>
                                <DateBttn
                                    compactDot
                                    date={$displayedDateStore
                                        .clone()
                                        .year(year)
                                        .startOf("year")}
                                    granularity="year"
                                    onSelect={tabs.includes("month")
                                        ? () => {
                                              displayedDateStore.set(
                                                  $displayedDateStore
                                                      .clone()
                                                      .year(year)
                                                      .startOf("year"),
                                              );
                                              crrTabStore.set("month");
                                          }
                                        : null}
                                    className={cn(
                                        "tracking-wide px-1 !pt-2.5 !pb-4",
                                        "text-base",
                                    )}
                                    dotContainerClassName={"bottom-[.3rem]"}
                                >
                                    {$displayedDateStore
                                        .clone()
                                        .year(year)
                                        .startOf("year")
                                        .year()}
                                </DateBttn>
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>

<style lang="postcss">
    .pnc-calendar {
        border-collapse: collapse;
        width: calc(100% + 2rem);
        min-width: 100%;
        margin-left: -1rem;
    }

    th {
        background-color: var(--color-background-table-header);
        color: var(--color-text-table-header);
        font-size: 0.6em;
        letter-spacing: 1px;
        padding: 4px;
        text-align: center;
        text-transform: uppercase;
    }

    .weekend {
        background-color: var(--color-background-weekend);
    }

    /* Calendared: with weekly notes on, the open week's row is tinted, and hovering a week number shows the row it opens.
       Each cell draws its part behind its contents (the first and last round the ends): cells in a collapsed table cannot
       be rounded, and a shape on the row itself is laid out by the browser as an extra cell */
    .pnc-week-row > td {
        position: relative;
        isolation: isolate;
    }
    .pnc-week-row > td::before {
        content: "";
        position: absolute;
        inset: 1px 0;
        pointer-events: none;
        z-index: -1;
        transition: background-color 0.15s;
    }
    .pnc-week-row > td:first-child::before {
        left: 0.5rem;
        border-radius: var(--radius-m) 0 0 var(--radius-m);
    }
    .pnc-week-row > td:last-child::before {
        right: 0.5rem;
        border-radius: 0 var(--radius-m) var(--radius-m) 0;
    }
    .pnc-week-row:has(> td:first-child :global(.date-bttn:hover)) > td::before {
        background-color: var(--background-modifier-hover);
    }
    /* the open week keeps its tint while its number is hovered */
    .pnc-week-row.is-open-week > td::before,
    .pnc-week-row.is-open-week:has(> td:first-child :global(.date-bttn:hover)) > td::before {
        background-color: color-mix(in srgb, var(--interactive-accent) 14%, transparent);
    }
</style>
