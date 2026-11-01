import { getPeriodicityFromGranularity, type IGranularity } from "@/io";
import { capitalize } from "@/utils";

/**
 * The notice for a note named in a period's folder that its format doesn't read.
 * Calendared: plain DOM rather than a Svelte component mounted into the notice, which was never unmounted
 */
export function invalidFormatNotice({ granularity, filepath, formatValue, error }: {
    granularity: IGranularity;
    filepath: string;
    formatValue: string;
    error: string;
}): DocumentFragment {
    const periodicity = capitalize(getPeriodicityFromGranularity(granularity));
    const fragment = createFragment();
    fragment.createEl("p", { cls: "m-0 text-[--text-warning]", text: `Warning: ${error}` });
    const message = fragment.createEl("p", { cls: "m-0" });
    message.appendText("This file ");
    message.createSpan({ cls: "u-pop", text: filepath });
    message.appendText(" will not be recognized as a");
    message.createSpan({ cls: "u-pop", text: ` ${periodicity} ` });
    message.appendText("note. Please use a different format.");
    const details = fragment.createEl("p", { cls: "m-0 flex justify-between" });
    details.createSpan({ cls: "u-pop", text: `File path: ${filepath}` });
    details.createSpan({ cls: "u-pop", text: `Format value: ${formatValue}` });
    return fragment;
}
