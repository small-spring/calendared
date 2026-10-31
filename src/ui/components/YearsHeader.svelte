<script lang="ts">
    import { YEARS_RANGE_SIZE } from "@/constants";
    import { displayedDateStore, todayStore, yearsRanges } from "@/stores";
    import { Header } from "./core";

    let showingCurrentRange: boolean = $derived(
        $yearsRanges.todayRange ===
            $yearsRanges.ranges[$yearsRanges.crrRangeIndex],
    );
    let crrRange = $derived(
        $yearsRanges.ranges[$yearsRanges.crrRangeIndex].split("-"),
    );

    $effect.pre(() => {
        if ($displayedDateStore) {
            // add new ranges or update existing ones every time displayed date changes
            yearsRanges.selectOrCreateRanges();
        }
    });
</script>

<Header
    nav={{
        type: "range",
        showingCrrDate: showingCurrentRange,
        decrement: () => {
            yearsRanges.updateRanges({
                action: "decrement",
                displayedDateModifier: -YEARS_RANGE_SIZE,
            });
        },
        increment: () => {
            yearsRanges.updateRanges({ action: "increment" });
        },
    }}
>
    {#snippet leftTitleSnippet()}
        <div
            id="years-range"
            class="!text-[--color-text-header-title] text-xl font-semibold mb-2"
        >
            {crrRange[0].slice(2)} - {crrRange[1].slice(2)}
        </div>
    {/snippet}
</Header>
