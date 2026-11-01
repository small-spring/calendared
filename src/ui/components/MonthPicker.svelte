<script lang="ts">
    // Calendared: month picker shown as a popover from the header's year chevron.
    // Replaces upstream's "Month" tab (YearHeader + months table in Calendar.svelte).
    import { crumbText, periodStart } from "@/navigation";
    import { noteAt } from "@/io";
    import { periodRulesStore, settingsStore } from "@/settings";
    import { displayedDateStore, todayStore } from "@/stores";
    import { cn } from "@/ui/utils";
    import { inLocale } from "@/calendar-locale";
    import Arrow from "./core/Arrow.svelte";
    import DateBttn from "./core/DateBttn.svelte";
    import PeriodTitle from "./core/PeriodTitle.svelte";

    interface Props {
        /** Called after a month is picked */
        onPick: () => void;
    }
    let { onPick }: Props = $props();

    // Calendared: the year by its own start month, its 12 months from there (docs/adr/0039)
    let rules = $derived($periodRulesStore);
    let pickerYear = $state(periodStart("year", $displayedDateStore, $periodRulesStore));
    let months = $derived(Array.from({ length: 12 }, (_, i) => pickerYear.clone().add(i, "months")));
    // Calendared: read through the vault source with the settings read reactively (docs/adr/0016)
    let yearFileData = $derived(noteAt("year", pickerYear, $settingsStore));
</script>

<div class="flex items-center justify-between mb-1">
    <Arrow
        direction="left"
        onClick={() => (pickerYear = pickerYear.clone().subtract(1, "year"))}
        tooltip="Previous year"
        className="!h-auto !py-1 !px-2 [&>svg]:w-1.5"
    />
    <!-- like every other year label, opens (or creates) the yearly note -->
    <PeriodTitle
        date={pickerYear}
        title={{
            granularity: "year",
            fileData: yearFileData,
            formatValue: "YYYY",
            text: crumbText("year", pickerYear, $settingsStore.localeSettings.localeOverride, rules),
        }}
        textClassName="text-sm"
        onOpen={onPick}
    />
    <Arrow
        direction="right"
        onClick={() => (pickerYear = pickerYear.clone().add(1, "year"))}
        tooltip="Next year"
        className="!h-auto !py-1 !px-2 [&>svg]:w-1.5"
    />
</div>
<div class="grid grid-cols-3 gap-0.5">
    {#each months as month}
        <DateBttn
            compactDot
            date={month}
            granularity="month"
            className={cn(
                "px-1 !pt-1.5 !pb-3 text-sm",
                month.isSame($displayedDateStore, "month") &&
                    !month.isSame($todayStore, "month") &&
                    "!bg-[--background-modifier-hover]",
            )}
            dotContainerClassName="bottom-[.2rem]"
            onSelect={() => {
                displayedDateStore.set(month.clone().startOf("month"));
                onPick();
            }}
        >
            {inLocale(month, $settingsStore.localeSettings.localeOverride).format("MMM")}
        </DateBttn>
    {/each}
</div>
