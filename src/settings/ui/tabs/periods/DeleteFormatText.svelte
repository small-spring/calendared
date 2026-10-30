<script lang="ts">
    import { type IGranularity } from "@/io";
    import { type PeriodSettings } from "@/settings";
    import FilepathsCount from "./FilepathsCount.svelte";
    import { Writable } from "svelte/store";

    interface Props {
        settings: Writable<PeriodSettings>;
        granularity: IGranularity;
        format: PeriodSettings["formats"][number];
    }

    let { settings, granularity, format }: Props = $props();
</script>

Are you sure you want to delete this format? <FilepathsCount
    {settings}
    {granularity}
    {format}
    separator=""
/> using it.
