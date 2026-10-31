<script lang="ts">
    import { settingsStore } from "@/settings";
    import { getPeriodicityFromGranularity } from "./parse";
    import { type IGranularity } from "./types";

    interface Props {
        granularity: IGranularity;
    }
    const { granularity }: Props = $props();

    const periodicity = $derived(getPeriodicityFromGranularity(granularity));
    // Calendared: always the period's own format (the dialog only opens for enabled periods)
    const format = $derived($settingsStore.periods[granularity].format);
</script>

Note: Using {periodicity} format
<span class="u-pop">{format}</span>
