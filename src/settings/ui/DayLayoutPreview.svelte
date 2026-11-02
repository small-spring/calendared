<script lang="ts">
  // Calendared: under "Days shown", the mini calendar for today's daily note with the chosen value, so the choice can be
  // seen. Only the days come from the mini calendar (dayLayoutPreview); it is drawn plainly and opens nothing
  import { dayLayoutPreview } from "@/navigation";
  import { periodRulesStore, settingsStore } from "@/settings";
  import { todayStore } from "@/stores";
  import { cn } from "@/ui/utils";

  let cells = $derived(
    dayLayoutPreview(
      $todayStore,
      $settingsStore.miniCalendar.dayLayout,
      $periodRulesStore,
      $settingsStore.localeSettings.localeOverride,
    ),
  );
</script>

<div
  class="calendared-day-layout-preview mt-1.5 inline-grid grid-cols-7 gap-0.5 rounded-[var(--radius-s)] px-1.5 py-1 [border:1px_solid_var(--background-modifier-border)]"
  aria-label="Example: today's daily note"
>
  {#each cells as cell (cell.day)}
    <div class="flex min-w-[2.2em] flex-col items-center text-center">
      <span class="text-[0.7em] font-semibold text-[var(--text-muted)]">{cell.weekday}</span>
      <span
        class={cn(
          "rounded-[var(--radius-s)] px-1 text-xs",
          cell.isToday ? "bg-[var(--interactive-accent)] font-semibold text-[var(--text-on-accent)]" : "text-[var(--text-normal)]",
        )}>{cell.day}</span
      >
    </div>
  {/each}
</div>
