<script lang="ts">
    import { getPeriodicityFromGranularity } from "./parse";
    import { getNormalizedPeriodSettings } from "./settings";
    import { type IGranularity } from "./types";

    interface Props {
        granularity: IGranularity;
    }
    const { granularity }: Props = $props();

    const periodicity = $derived(getPeriodicityFromGranularity(granularity));
    const { settings: periodSettings, type: periodSettingsType } = $derived(
        getNormalizedPeriodSettings(granularity),
    );
</script>

{#if periodSettingsType === "period"}
    Note: Using {periodicity} format
    <span class="u-pop">{periodSettings.format}</span>
{:else if periodSettingsType === "default"}
    Note: Using default format <span class="u-pop"
        >{periodSettings.format}</span
    >
{/if}
