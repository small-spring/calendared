<script lang="ts">
    import { monthsIndexesInQuarters } from "@/constants";
    import { IGranularity } from "@/io";
    import { displayedDateStore, localeDataStore, yearsRanges } from "@/stores";
    import {
        crrTabStore,
        getEnabledPeriods,
        periodTabs,
    } from "@/stores/calendar";
    import { onMount } from "svelte";
    import {
        cn,
        getMonth,
        getStartOfWeek,
        getYears,
        isWeekend,
    } from "../utils";
    import MonthHeader from "./MonthHeader.svelte";
    import YearHeader from "./YearHeader.svelte";
    import YearsHeader from "./YearsHeader.svelte";
    import DateBttn from "./core/DateBttn.svelte";
    import { settingsStore } from "@/settings";

    let { weekdaysShort } = $derived($localeDataStore);
    let month = $derived(getMonth($displayedDateStore));

    let crrTab = $derived($crrTabStore);
    let tabs: typeof periodTabs = $state(periodTabs);
    let enabledPeriods: Record<IGranularity, boolean> = $state(
        {} as Record<IGranularity, boolean>,
    );
    let containerEl: HTMLDivElement | null = $state(null);

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
        reached when the day (or month) period is disabled in settings.
    -->

    {#if crrTab === "day" && enabledPeriods.day}
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
                {#each month as week (week.weekNum)}
                    <tr>
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
                                    {getStartOfWeek(week.days).week() < 10
                                        ? "0"
                                        : ""}{getStartOfWeek(week.days).week()}
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
                                    {day.format("D")}
                                </DateBttn>
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
    {#if crrTab === "month" && enabledPeriods.month}
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
                                    onSelect={enabledPeriods.day
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
                                    {$displayedDateStore
                                        .clone()
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
    {#if crrTab === "year" && enabledPeriods.year}
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
                                    onSelect={enabledPeriods.month
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
</style>
