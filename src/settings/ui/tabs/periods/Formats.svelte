<script lang="ts">
    import { type IGranularity } from "@/io";
    import { type PeriodSettings } from "@/settings";
    import { type Writable } from "svelte/store";
    import Format from "./Format.svelte";
    interface Props {
        granularity: IGranularity;
        settings: Writable<PeriodSettings>;
    }

    let { granularity, settings }: Props = $props();

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
</script>

<div class="setting-item flex flex-col">
    <div class="mb-4 w-full !mr-0">
        <div class="setting-item-info">
            <div
                class="setting-item-name mb-2 flex items-center justify-between"
            >
                <span>Format</span>
            </div>
            <div class="setting-item-description">
                <p class="mt-0 mb-1">
                    Required tokens: <span class="u-pop"
                        >{getExpectedTokens(granularity)}</span
                    >
                </p>
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
    <Format {settings} {granularity} />
</div>
