<script lang="ts">
    import { type IGranularity } from "@/io";
    import { type PeriodSettings } from "@/settings";
    import FilepathsCount from "./FilepathsCount.svelte";
    import { type Writable } from "svelte/store";

    interface Props {
        settings: Writable<PeriodSettings>;
        granularity: IGranularity;
        format: PeriodSettings["formats"][number];
        filepaths: string[];
    }

    let { settings, granularity, format, filepaths }: Props = $props();
</script>

Are you sure you want to delete this format? <FilepathsCount
    {settings}
    {granularity}
    {format}
    {filepaths}
    separator=""
/> can only be read with it.
