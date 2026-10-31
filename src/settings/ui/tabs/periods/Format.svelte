<script lang="ts">
  // Calendared: one field for the period's one format (docs/adr/0019)
  import { DEFAULT_FORMATS_PER_GRANULARITY } from "@/constants";
  import { type IGranularity } from "@/io";
  import { validateFormat } from "@/io/validation";
  import { settingsStore, type PeriodSettings } from "@/settings";
  import { cn } from "@/ui/utils";
  import { debounce } from "obsidian";
  import { weekSchemeFor } from "@/weeks";
  import { type Writable } from "svelte/store";
  import FilepathsCount from "./FilepathsCount.svelte";

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

  // read again when any period's format or the week start changes (another period's format can't be the same)
  let error = $derived.by(() => {
    void $settingsStore;
    return validateFormat(value, granularity);
  });

  // Calendared: weekly names come from the week scheme (the row's Monday), not from today's date
  const previewName = (formatValue: string) => {
    if (granularity !== "week") return window.moment().format(formatValue);
    const weeks = weekSchemeFor($settingsStore.localeSettings);
    return weeks.format(weeks.weekOf(window.moment()), formatValue);
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
  <div class="pl-[1px] [font-size:calc(var(--font-ui-small)+1px)]">
    <FilepathsCount {granularity} format={$settings.format} {error} />
    {#if error}
      <span class="text-[var(--text-error)]">{previewName(value)} • </span>
      <span class="text-[var(--text-error)]" id={`format-error-${granularity}`}>{error}</span>
    {:else}
      <span class="u-pop">{previewName(value.trim() ? value : defaultFormat)}</span>
    {/if}
  </div>
</div>
