<script lang="ts">
    import { YEARS_RANGE_SIZE } from "@/constants";
    import { displayedDateStore, todayStore, yearsRanges } from "@/stores";
    import { Header } from "./core";
    import { getContext } from "svelte";
    import { cn } from "../utils";
    import { Platform } from "obsidian";

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

    let minimalMode = getContext("minimalMode") as
        | { value: boolean }
        | undefined;
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
            yearsRanges.updateRanges({ action: "increment" });
        },
    }}
>
    {#snippet leftTitleSnippet()}
        <div
            id="years-range"
            class={cn(
                // Calendared: always use upstream's minimal-mode size
                "!text-[--color-text-header-title] text-xl font-semibold mb-2",
            )}
        >
            {crrRange[0].slice(2)} - {crrRange[1].slice(2)}
        </div>
    {/snippet}
</Header>
