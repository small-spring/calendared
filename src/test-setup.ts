import moment from "moment";
import "moment/locale/ja";
import { afterEach, vi } from "vitest";

// loading a locale also switches moment to it; start every test from English like a fresh moment
moment.locale("en");

// Obsidian puts its bundled moment on `window`; the plugin reads it from there
vi.stubGlobal("window", { moment });

afterEach(() => {
    moment.locale("en");
    vi.useRealTimers();
});
