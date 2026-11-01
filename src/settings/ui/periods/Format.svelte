<script lang="ts">
  // Calendared: one field for the period's one format (docs/adr/0019)
  import { DEFAULT_FORMATS_PER_GRANULARITY } from "@/constants";
  import { type IGranularity } from "@/io";
  import { validateFormat } from "@/io/validation";
  import { settingsStore, type PeriodSettings } from "@/settings";
  import { cn } from "@/ui/utils";
  import { debounce } from "obsidian";
  import { formatPeriod, periodOf, periodRulesFor } from "@/periods";
  import { weekSchemeFor } from "@/weeks";
  import { type Writable } from "svelte/store";
  import FilepathsCount from "./FilepathsCount.svelte";
  import WeekFormatCheck from "./WeekFormatCheck.svelte";
  import MigrationNotice from "../migrations/MigrationNotice.svelte";

  interface Props {
    settings: Writable<PeriodSettings>;
    granularity: IGranularity;
  }

  let { settings, granularity }: Props = $props();

  const defaultFormat = $derived(DEFAULT_FORMATS_PER_GRANULARITY[granularity]);

  // the input edits its own copy; it follows the saved format when that changes from elsewhere (e.g. the weekly
  // "Use GGGG-[W]WW" button), except while it is being edited, so typing is never overwritten
  // svelte-ignore state_referenced_locally
  let value = $state($settings.format);
  let textInputEl: HTMLInputElement | undefined = $state();
  $effect.pre(() => {
    const saved = $settings.format;
    if (textInputEl && document.activeElement === textInputEl) return;
    value = saved;
  });

  // read again when the week start changes (a weekly format is read with it)
  let error = $derived.by(() => {
    void $settingsStore;
    return validateFormat(value, granularity);
  });

  // Calendared: today's period named as its note would be (weeks by the row's Monday, fiscal quarters and years)
  const previewName = (formatValue: string) => {
    const rules = periodRulesFor($settingsStore);
    return formatPeriod(periodOf(granularity, window.moment(), rules), formatValue, rules);
  };
  // Calendared: a weekly format also shows the week at New Year, where names break most often
  const newYearPreview = (formatValue: string) => {
    const weeks = weekSchemeFor($settingsStore.localeSettings);
    // the week around New Year, where week-based and calendar years differ: calendar on purpose
    const week = weeks.weekOf(window.moment().endOf("year"));
    const range = weeks.rangeOf(week);
    return { name: weeks.format(week, formatValue), range: range ? `${range.start.format("M/D")} – ${range.end.format("M/D")}` : "" };
  };

  // an empty format can't name new notes (it would write a timestamp as the file name), so it isn't saved
  const save = debounce(() => {
    if (!value.trim()) return;
    settings.update((s) => {
      s.format = value;
      return s;
    });
  }, 500, true);

  function handleBlur() {
    if (value.trim()) return;
    value = defaultFormat;
    settings.update((s) => {
      s.format = defaultFormat;
      return s;
    });
  }
</script>

<div class="w-full rounded-lg p-3 border border-solid border-[var(--background-modifier-border)]">
  <div class="flex items-center mb-2">
    <input
      type="text"
      bind:this={textInputEl}
      bind:value
      oninput={save}
      onblur={handleBlur}
      spellcheck={false}
      placeholder={defaultFormat}
      aria-label="Format"
      aria-invalid={!!error}
      aria-describedby={error ? `format-error-${granularity}` : undefined}
      class={cn(
        "flex-1 !bg-transparent",
        error && "!text-[var(--text-error)] !border-[var(--background-modifier-error)]",
      )}
    />
  </div>
  <!-- Calendared: right under the field, while notes still use the format it had before (docs/adr/0035) -->
  <MigrationNotice which={granularity} />
  {#if granularity === "week"}
    <WeekFormatCheck {settings} />
  {/if}
  <div class="pl-[1px] [font-size:calc(var(--font-ui-small)+1px)]">
    <FilepathsCount {granularity} format={$settings.format} {error} />
    {#if error}
      <span class="text-[var(--text-error)]">{previewName(value)} • </span>
      <span class="text-[var(--text-error)]" id={`format-error-${granularity}`}>{error}</span>
    {:else}
      <span class="u-pop">{previewName(value.trim() ? value : defaultFormat)}</span>
      {#if granularity === "week"}
        {@const newYear = newYearPreview(value.trim() ? value : defaultFormat)}
        · New Year: <span class="u-pop">{newYear.name}</span>
        {#if newYear.range}<span class="text-[var(--text-muted)]">({newYear.range})</span>{/if}
      {/if}
    {/if}
  </div>
</div>
