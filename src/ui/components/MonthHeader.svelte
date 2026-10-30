<script lang="ts">
    import { noteAt } from "@/io";
    import { inLocale } from "@/calendar-locale";
    import { settingsStore } from "@/settings";
    import { displayedDateStore } from "@/stores";
    import { todayStore } from "@/stores/dates";
    import { Header } from "./core";
    import MonthPicker from "./MonthPicker.svelte";

    // Calendared: read through the vault source with the settings read reactively (docs/adr/0016)
    let monthFileData = $derived(noteAt("month", $displayedDateStore, $settingsStore));
    let yearFileData = $derived(noteAt("year", $displayedDateStore.clone().startOf("year"), $settingsStore));
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
