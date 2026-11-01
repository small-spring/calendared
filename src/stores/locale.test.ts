import { writable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/settings/constants";

vi.mock("@/settings", () => ({ settingsStore: writable(structuredClone(DEFAULT_SETTINGS)) }));

const { get } = await import("svelte/store");
const { settingsStore } = await import("@/settings");
const { switchLocale } = await import("./locale");

describe("switchLocale: カレンダーの言語を変える", () => {
    it("言語だけを変え、週の始まりは戻さない（週のノートが指す 7 日を変えない。ADR-0047）", () => {
        settingsStore.update((s) => ({ ...s, localeSettings: { localeOverride: "en", weekStartId: 6 } }));

        switchLocale("ja");

        expect(get(settingsStore).localeSettings).toEqual({ localeOverride: "ja", weekStartId: 6 });
    });
});
