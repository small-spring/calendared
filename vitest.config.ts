import { resolve } from "path";
import { defineConfig } from "vitest/config";

// Calendared: unit tests for the plain logic (no Obsidian, no UI). See docs/development.md
export default defineConfig({
    resolve: {
        alias: {
            "@": resolve(process.cwd(), "src"),
            obsidian: resolve(process.cwd(), "src/test-obsidian.ts"),
        },
    },
    test: {
        include: ["src/**/*.test.ts"],
        environment: "node",
        setupFiles: ["./src/test-setup.ts"],
    },
});
