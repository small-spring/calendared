<script lang="ts">
    import { YEARS_RANGE_SIZE } from "@/constants";
    import { displayedDateStore, todayStore, yearsRanges } from "@/stores";
    import { Header } from "./core";
    import { periodRulesFor } from "@/periods";
    import { settingsStore } from "@/settings";

    // Calendared: ranges of year names, like the cells below (docs/adr/0039)
    let rules = $derived(periodRulesFor($settingsStore));

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
            yearsRanges.selectOrCreateRanges(rules);
        }
    });
</script>

<Header
    nav={{
        type: "12 years",
        showingCrrDate: showingCurrentRange,
        decrement: () => {
            yearsRanges.updateRanges({
                action: "decrement",
                displayedDateModifier: -YEARS_RANGE_SIZE,
                rules,
            });
        },
        increment: () => {
            yearsRanges.updateRanges({ action: "increment", rules });
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
