<script lang="ts">
    import { periodRulesStore, settingsStore } from "@/settings";
    import { displayedDateStore, moveDisplayed } from "@/stores";
    import { todayStore } from "@/stores/dates";
    import { Header } from "./core";
    import { yearTitle } from "./core/year-title";
    import { samePeriod } from "@/periods";
    // Calendared: the year by its own start month, written "2026–27" if it isn't January (docs/adr/0039)
    let rules = $derived($periodRulesStore);
    let isToday = $derived(samePeriod("year", $displayedDateStore, $todayStore, rules));
</script>

<Header
    leftDate={$displayedDateStore}
    leftTitle={yearTitle($displayedDateStore, $settingsStore, rules)}
    nav={{
        type: "year",
        showingCrrDate: isToday,
        decrement: () => moveDisplayed(-1, "year"),
        increment: () => moveDisplayed(1, "year"),
    }}
/>
