<script lang="ts">
    import { noteAt } from "@/io";
    import { inLocale } from "@/calendar-locale";
    import { periodRulesStore, settingsStore } from "@/settings";
    import { displayedDateStore, moveDisplayed } from "@/stores";
    import { todayStore } from "@/stores/dates";
    import { Header } from "./core";
    import MonthPicker from "./MonthPicker.svelte";
    import { yearTitle } from "./core/year-title";
    import { periodStart } from "@/periods";
    // Calendared: read through the vault source with the settings read reactively (docs/adr/0016)
    let monthFileData = $derived(noteAt("month", $displayedDateStore, $settingsStore));
    // Calendared: the year containing the month, by its own start month (docs/adr/0039)
    let rules = $derived($periodRulesStore);
    let yearStart = $derived(periodStart("year", $displayedDateStore, rules));
    let isToday = $derived($displayedDateStore.isSame($todayStore, "month"));
</script>

<Header
    leftDate={$displayedDateStore}
    leftTitle={{
        granularity: "month",
        fileData: monthFileData,
        formatValue: "MMM",
        widthSamples: Array.from({ length: 12 }, (_, i) =>
            inLocale($displayedDateStore, $settingsStore.localeSettings.localeOverride).month(i).format("MMM"),
        ),
    }}
    rightDate={yearStart}
    rightTitle={yearTitle(yearStart, $settingsStore, rules)}
    nav={{
        type: "month",
        showingCrrDate: isToday,
        decrement: () => moveDisplayed(-1, "month"),
        increment: () => moveDisplayed(1, "month"),
    }}
>
    {#snippet picker(close: () => void)}
        <MonthPicker onPick={close} />
    {/snippet}
</Header>
