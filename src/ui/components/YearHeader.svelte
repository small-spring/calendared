<script lang="ts">
    import { noteAt } from "@/io";
    import { settingsStore } from "@/settings";
    import { displayedDateStore } from "@/stores";
    import { todayStore } from "@/stores/dates";
    import { Header } from "./core";
    import { crumbText, samePeriod } from "@/navigation";
    import { periodRulesFor } from "@/periods";

    // Calendared: read through the vault source with the settings read reactively (docs/adr/0016)
    let fileData = $derived(noteAt("year", $displayedDateStore, $settingsStore));
    // Calendared: the year by its own start month, written "2026–27" if it isn't January (docs/adr/0039)
    let rules = $derived(periodRulesFor($settingsStore));
    let isToday = $derived(samePeriod("year", $displayedDateStore, $todayStore, rules));
</script>

<Header
    leftDate={$displayedDateStore}
    leftTitle={{
        granularity: "year",
        fileData,
        // Calendared: upstream used "YY" (e.g. "26")
        formatValue: "YYYY",
        text: crumbText("year", $displayedDateStore, $settingsStore.localeSettings.localeOverride, rules),
    }}
    nav={{
        type: "year",
        showingCrrDate: isToday,
        decrement: () => {
            displayedDateStore.update((date) =>
                date.clone().subtract(1, "year"),
            );
        },
        increment: () => {
            displayedDateStore.update((date) =>
                date.clone().add(1, "year"),
            );
        },
    }}
/>
