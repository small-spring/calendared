<script lang="ts">
  import "@/app.css";
  import { displayedDateStore, todayStore } from "@/stores";
  import { onDestroy } from "svelte";
  import Calendar from "../Calendar.svelte";

  let heartbeat = setInterval(() => {
    // update today
    let wasCrrMonthDisplayed =
      $todayStore.month() === $displayedDateStore.month();
    todayStore.set(window.moment());

    // update displayedDateStore to new current date only if new current date is one month ahead.
    if (
      wasCrrMonthDisplayed &&
      $todayStore
        .clone()
        .startOf("month")
        .isSame($displayedDateStore.clone().add(1, "month").startOf("month"))
    ) {
      displayedDateStore.set($todayStore);
    }
  }, 1000 * 60);

  onDestroy(() => {
    clearInterval(heartbeat);
  });
</script>

<Calendar />

<style lang="postcss">
  @tailwind utilities;
</style>
