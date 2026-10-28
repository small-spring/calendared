<script lang="ts">
    import { getFileData } from "@/io";
    import { displayedDateStore, notesChangedStore, yearsRanges } from "@/stores";
    import { todayStore } from "@/stores/dates";
    import { Header } from "./core";

    let fileData = $derived.by(() => {
        $notesChangedStore; // recompute when notes change
        return getFileData("year", $displayedDateStore);
    });
    let isToday = $derived($displayedDateStore.isSame($todayStore, "year"));

    $effect.pre(() => {
        if ($displayedDateStore) {
            // add new ranges or update existing ones every time displayed date changes
            yearsRanges.selectOrCreateRanges();
        }
    });
</script>

<Header
    leftDate={$displayedDateStore}
    leftTitle={{
        granularity: "year",
        fileData,
        // Calendared: upstream used "YY" (e.g. "26")
        formatValue: "YYYY",
    }}
    nav={{
        type: "year",
        showingCrrDate: isToday,
        decrement: () => {
            displayedDateStore.update((date) =>
                date.clone().subtract(1, "year"),
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
                date.clone().add(1, "year"),
            );
        },
    }}
>
    <!-- Calendared: upstream also showed the current 12-year range (e.g. "2020-2031") on the right; removed -->
</Header>
