<script lang="ts">
    import { granularities } from "@/constants";
    import Period from "./Period.svelte";
    import { setContext } from "svelte";
    import { writable } from "svelte/store";

    setContext("notesContext", {
        triggerRerender: writable(0),
    });
</script>

<div>
    <!-- Calendared: upstream said disabled periods could still be created from the command palette; they no longer can -->
    <div
        class="italic text-[var(--text-faint)] [font-size:var(--font-ui-small)] p-[var(--size-4-6)_var(--size-4-4)] pt-0"
    >
        Turning off a period hides it from the calendar and the commands, and
        stops creating its notes. Notes you already have are kept.
    </div>
    {#each granularities as granularity}
        <Period {granularity} />
    {/each}
</div>
