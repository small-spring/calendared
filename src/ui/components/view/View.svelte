<script lang="ts">
  import "@/app.css";
  import Calendar from "../Calendar.svelte";

  // Calendared: the timer that kept today current moved to the plugin (main.ts), so it runs with the pane closed
</script>

<Calendar />

<style lang="postcss">
  @tailwind utilities;
</style>
