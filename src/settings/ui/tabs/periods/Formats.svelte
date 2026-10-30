<script lang="ts">
    import { type IGranularity } from "@/io";
    import { validateFormat } from "@/io/validation";
    import { settingsStore, type PeriodSettings } from "@/settings";
    import { checkWeekFormat, isoWeekFormatFor, weekSchemeFor, type WeekName } from "@/weeks";
    import { type Writable } from "svelte/store";
    import { v4 as uuidv4 } from "uuid";
    import Format from "./Format.svelte";
    interface Props {
        granularity: IGranularity;
        settings: Writable<PeriodSettings>;
    }

    let { granularity, settings }: Props = $props();

    // Calendared: the format used for new notes is listed first (display order only)
    let orderedFormats = $derived(
        Object.values($settings.formats).sort(
            (a, b) => Number(b.id === $settings.selectedFormat.id) - Number(a.id === $settings.selectedFormat.id),
        ),
    );

    function getExpectedTokens(granularity: IGranularity): string {
        const baseTokens = "Y or y (year)";
        switch (granularity) {
            case "quarter":
                return `${baseTokens}, Q (quarter)`;
            case "month":
                return `${baseTokens}, M (month)`;
            case "week":
                return "GG (week year) and W (week)";
            case "day":
                return `${baseTokens}, M (month) and D (day)`;
            default:
                return baseTokens;
        }
    }

    // Calendared: weekly formats are checked against the week scheme (docs/spec/periods.md). Formats whose names break around
    // New Year, or don't match the calendar's week numbers, get a warning and a one-click switch to the ISO version
    let weeks = $derived(weekSchemeFor($settingsStore.localeSettings));
    let weekFormat = $derived(granularity === "week" && !$settings.selectedFormat.error ? $settings.selectedFormat.value.trim() : "");
    let weekCheck = $derived(weekFormat ? checkWeekFormat(weekFormat, weeks) : null);
    let suggestedWeekFormat = $derived(isoWeekFormatFor(weekFormat));
    let newYearWeek = $derived(weeks.weekOf(window.moment().endOf("year")));
    const describeWeek = (week: WeekName) => {
        const range = weeks.rangeOf(week);
        return `week ${week.week} of ${week.weekYear}${range ? ` (${range.start.format("M/D")} – ${range.end.format("M/D")})` : ""}`;
    };

    /**
     * Use the ISO version for new weekly notes: add it to the formats (or pick it if it's there) and select it.
     * The old format stays, so notes named with it are still recognized. Renaming them (migration) is a separate step
     */
    function useSuggestedWeekFormat() {
        const existing = Object.values($settings.formats).find((f) => f.value === suggestedWeekFormat);
        const id = existing?.id ?? uuidv4();
        const format = { id, value: suggestedWeekFormat, error: validateFormat(suggestedWeekFormat, granularity, id), loading: false };
        settings.update((s) => {
            s.formats[id] = format;
            s.selectedFormat = format;
            return s;
        });
    }
</script>

<div class="setting-item flex flex-col">
    <div class="mb-4 w-full !mr-0">
        <div class="setting-item-info">
            <div
                class="setting-item-name mb-2 flex items-center justify-between"
            >
                <!-- Calendared: the format used for new notes is marked in the list below instead of repeated here -->
                <span>Format</span>
            </div>
            <div class="setting-item-description">
                <p class="mt-0 mb-1">
                    Required tokens: <span class="u-pop"
                        >{getExpectedTokens(granularity)}</span
                    >
                </p>
                {#if weekFormat}
                    <p class="mt-0 mb-1">
                        Preview: <span class="u-pop">{weeks.format(weeks.weekOf(window.moment()), weekFormat)}</span>
                        · New Year: <span class="u-pop">{weeks.format(newYearWeek, weekFormat)}</span>
                        ({describeWeek(newYearWeek)})
                    </p>
                {:else if $settings.selectedFormat.value.trim()}
                    <p class="mt-0 mb-1">
                        Preview: <span class="u-pop"
                            >{window
                                .moment()
                                .format($settings.selectedFormat.value)}</span
                        >
                    </p>
                {/if}
                {#if weekCheck && (weekCheck.unreadable || weekCheck.mismatched)}
                    <div class="mt-2 mb-2 p-2 rounded-[var(--radius-s)] [border:1px_solid_var(--background-modifier-border)]">
                        {#if weekCheck.unreadable}
                            <p class="mt-0 mb-1 text-[var(--text-warning)]">
                                This format mixes up notes around New Year: {describeWeek(weekCheck.unreadable.week)} would be
                                named "{weekCheck.unreadable.name}", which reads back as another week.
                            </p>
                        {:else if weekCheck.mismatched}
                            <p class="mt-0 mb-1 text-[var(--text-warning)]">
                                File names won't always match the calendar's week numbers: {describeWeek(weekCheck.mismatched.week)}
                                would be named "{weekCheck.mismatched.name}" instead of "{weekCheck.mismatched.expected}".
                            </p>
                        {/if}
                        <p class="mt-0 mb-1">
                            GG is the week's year and W its number (ISO 8601, like Google Calendar). Existing notes keep working.
                        </p>
                        <button class="mod-cta" onclick={useSuggestedWeekFormat}>Use {suggestedWeekFormat}</button>
                    </div>
                {/if}
                <!-- Calendared: say where the link goes (site and address), not just "Syntax Reference" -->
                <p class="mt-0 mb-0">
                    Format tokens:
                    <a
                        class="focus-visible:shadow-[0_0_0_3px_var(--background-modifier-border-focus)]"
                        href="https://momentjs.com/docs/#/displaying/format/"
                        title="https://momentjs.com/docs/#/displaying/format/"
                        >Moment.js documentation</a
                    >
                    <span class="text-[var(--text-faint)]">(momentjs.com)</span>
                </p>
            </div>
        </div>
    </div>
    <form
        class="w-full"
        onsubmit={(e) => {
            e.preventDefault();
        }}
    >
        <fieldset role="radiogroup" class="border-none p-0 m-0">
            <legend class="sr-only">Choose a date format</legend>
            {#each orderedFormats as format (format.id)}
                <Format {settings} {format} {granularity} />
            {/each}
            <Format {settings} type="skeleton" />
        </fieldset>
    </form>
</div>
