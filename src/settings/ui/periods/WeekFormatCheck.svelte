<script lang="ts">
    import { validateFormat } from "@/io/validation";
    import { settingsStore, type PeriodSettings } from "@/settings";
    import { checkWeekFormat, dayRangeText, isoWeekFormatFor, weekSchemeFor, type WeekName } from "@/weeks";
    import { type Writable } from "svelte/store";

    interface Props {
        settings: Writable<PeriodSettings>;
    }

    let { settings }: Props = $props();

    // Calendared: weekly formats are checked against the week scheme (docs/spec/periods.md). Formats whose names break around
    // New Year, or don't match the calendar's week numbers, get a warning and a one-click switch to the ISO version.
    // Shown right under the field, above the note count (docs/research/2026-10-31-field-warning-placement.md)
    let weeks = $derived(weekSchemeFor($settingsStore.localeSettings));
    // read again when any period's format changes (another period's format can't be the same)
    let weekFormat = $derived.by(() => {
        void $settingsStore;
        return !validateFormat($settings.format, "week") ? $settings.format.trim() : "";
    });
    let weekCheck = $derived(weekFormat ? checkWeekFormat(weekFormat, weeks) : null);
    let suggestedWeekFormat = $derived(isoWeekFormatFor(weekFormat));
    let showWhy = $state(false);
    const describeWeek = (week: WeekName) => {
        const range = weeks.rangeOf(week);
        return `week ${week.week} of ${week.weekYear}${range ? ` (${dayRangeText(range)})` : ""}`;
    };

    /**
     * Use the ISO version for new weekly notes. Notes named with the old format are read again once renamed to the new
     * one (migration, a separate step)
     */
    function useSuggestedWeekFormat() {
        settings.update((s) => {
            s.format = suggestedWeekFormat;
            return s;
        });
    }
</script>

{#if weekCheck && (weekCheck.unreadable || weekCheck.mismatched)}
    <!-- Calendared: no frame of its own; the field's box and the warning color already tie it to the field -->
    <div class="mb-2">
        <div class="flex flex-wrap items-start gap-x-3 gap-y-1">
            <button class="mod-cta shrink-0" onclick={useSuggestedWeekFormat}>Use {suggestedWeekFormat}</button>
            <!-- Calendared: the fix first, then what goes wrong (as small as the field's description); why the fix works is behind "Why?" -->
            <p class="m-0 flex-1 min-w-[12rem] [font-size:var(--font-ui-smaller)] text-[var(--text-warning)]">
                {#if weekCheck.unreadable}
                    Breaks around New Year: {describeWeek(weekCheck.unreadable.week)} is named
                    "{weekCheck.unreadable.name}".
                {:else if weekCheck.mismatched}
                    Differs from the calendar's week numbers: {describeWeek(weekCheck.mismatched.week)} is named
                    "{weekCheck.mismatched.name}", not "{weekCheck.mismatched.expected}".
                {/if}
                <a
                    href={null}
                    class="ml-1 cursor-[var(--cursor)] focus-visible:shadow-[0_0_0_3px_var(--background-modifier-border-focus)]"
                    role="button"
                    tabindex="0"
                    aria-expanded={showWhy}
                    onclick={() => (showWhy = !showWhy)}
                    onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), (showWhy = !showWhy))}
                    >Why?</a
                >
            </p>
        </div>
        {#if showWhy}
            <p class="mt-2 mb-0 [font-size:var(--font-ui-smaller)] text-[var(--text-muted)]">
                {#if weekCheck.unreadable}
                    {@const readBack = weeks.parse(weekCheck.unreadable.name, weekFormat)}
                    {#if readBack}
                        "{weekCheck.unreadable.name}" reads back as {describeWeek(readBack)}, so the two weeks' notes get mixed up.
                    {:else}
                        "{weekCheck.unreadable.name}" can't be read back as a week, so its note won't show in the calendar.
                    {/if}
                {:else if weekCheck.mismatched}
                    The calendar shows this week as week {weekCheck.mismatched.week.week}, but its note would be named
                    "{weekCheck.mismatched.name}".
                {/if}
                GG is the year the week belongs to and W its number (ISO 8601, like Google Calendar), so names
                match the calendar all year.
            </p>
        {/if}
    </div>
{/if}
