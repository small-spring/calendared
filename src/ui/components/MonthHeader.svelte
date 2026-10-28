<script lang="ts">
    import { getFileData } from "@/io";
    import { settingsStore } from "@/settings";
    import { displayedDateStore, yearsRanges } from "@/stores";
    import { todayStore } from "@/stores/dates";
    import { Header } from "./core";
    import MonthPicker from "./MonthPicker.svelte";

    let monthFileData = $state(getFileData("month", $displayedDateStore));
    let yearFileData = $state(
        getFileData("year", $displayedDateStore.clone().startOf("year")),
    );
    $effect.pre(() => {
        if ($settingsStore.filepaths) {
            monthFileData = getFileData("month", $displayedDateStore);

            yearFileData = getFileData(
                "year",
                $displayedDateStore.clone().startOf("year"),
            );
        }
    });
    let isToday = $derived($displayedDateStore.isSame($todayStore, "month"));
</script>

<Header
    leftDate={$displayedDateStore}
    leftTitle={{
        granularity: "month",
        fileData: monthFileData,
        formatValue: "MMM",
        widthSamples: Array.from({ length: 12 }, (_, i) =>
            $displayedDateStore.clone().month(i).format("MMM"),
        ),
    }}
    rightDate={$displayedDateStore.clone().startOf("year")}
    rightTitle={{
        granularity: "year",
        fileData: yearFileData,
        formatValue: "YYYY",
    }}
    nav={{
        type: "month",
        showingCrrDate: isToday,
        decrement: () => {
            displayedDateStore.update((date) =>
                date.clone().subtract(1, "month"),
            );
        },
        reset: () => {
            yearsRanges.update((values) => ({
                ...values,
                crrRangeIndex: values.ranges.findIndex(
                    (range) => range === values.todayRange,
                ),
            }));
            displayedDateStore.set($todayStore);
        },
        increment: () => {
            displayedDateStore.update((date) =>
                date.clone().add(1, "month"),
            );
        },
    }}
>
    {#snippet picker(close: () => void)}
        <MonthPicker onPick={close} />
    {/snippet}
</Header>
