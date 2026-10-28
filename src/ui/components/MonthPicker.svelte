<script lang="ts">
    // Calendared: month picker shown as a popover from the header's year chevron.
    // Replaces upstream's "Month" tab (YearHeader + months table in Calendar.svelte).
    import { monthsIndexesInQuarters } from "@/constants";
    import { displayedDateStore, todayStore } from "@/stores";
    import { cn } from "@/ui/utils";
    import Arrow from "./core/Arrow.svelte";
    import DateBttn from "./core/DateBttn.svelte";

    interface Props {
        /** Called after a month is picked */
        onPick: () => void;
    }
    let { onPick }: Props = $props();

    let pickerYear = $state($displayedDateStore.clone().startOf("year"));
</script>

<div class="flex items-center justify-between mb-1">
    <Arrow
        direction="left"
        onClick={() => (pickerYear = pickerYear.clone().subtract(1, "year"))}
        tooltip="Previous year"
        className="!h-auto !py-1 !px-2 [&>svg]:w-1.5"
    />
    <span class="text-sm font-semibold">{pickerYear.format("YYYY")}</span>
    <Arrow
        direction="right"
        onClick={() => (pickerYear = pickerYear.clone().add(1, "year"))}
        tooltip="Next year"
        className="!h-auto !py-1 !px-2 [&>svg]:w-1.5"
    />
</div>
<div class="grid grid-cols-3 gap-0.5">
    {#each monthsIndexesInQuarters.flat() as monthIndex}
        {@const month = pickerYear.clone().month(monthIndex)}
        <DateBttn
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
            {month.format("MMM")}
        </DateBttn>
    {/each}
</div>
