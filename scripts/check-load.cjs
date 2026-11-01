// Smoke test: load the built plugin bundle in Node with a fake Obsidian, and fail if loading throws.
//
// Catches crashes that happen while the bundle is being loaded (e.g. "Cannot access 'X' before initialization"
// from an import cycle), which type checking and ESLint can't see. It does NOT run the plugin's onload()
// or check any behavior.
//
// Usage: node scripts/check-load.cjs [path/to/main.js]   (default: ./main.js)
"use strict";

const fs = require("fs");
const path = require("path");
const Module = require("module");

const bundlePath = path.resolve(process.argv[2] ?? "main.js");

// ---------------------------------------------------------------------------
// 1. A value that pretends to be anything.
//    Reading any property returns another fake, and it can be called (`fake()`) or constructed (`new fake()`).
//    So code like `obsidian.Platform.isMobile` or `new obsidian.Notice("hi")` runs without crashing.
// ---------------------------------------------------------------------------
function fake() {
  return new Proxy(function () {}, {
    get(_target, key) {
      if (key === Symbol.toPrimitive) return () => ""; // used in string concatenation / template literals
      if (key === "then") return undefined; // don't look like a Promise, or `await fake` would hang
      return fake();
    },
    apply: () => fake(),
    construct: () => fake(),
  });
}

// ---------------------------------------------------------------------------
// 2. Fake modules that only exist inside Obsidian.
//    The bundle keeps these as `require("obsidian")` etc. (see `external` in vite.config.ts).
//    Every export is a class that can also be called, so `class X extends Plugin {}`, `new Notice()` and
//    functions such as `getLanguage()` all work.
// ---------------------------------------------------------------------------
const OBSIDIAN_ONLY_MODULES = ["obsidian", "electron"];
const isObsidianOnly = (request) =>
  OBSIDIAN_ONLY_MODULES.includes(request) || request.startsWith("@codemirror/") || request.startsWith("@lezer/");

const originalLoad = Module._load;
Module._load = function (request, ...rest) {
  if (isObsidianOnly(request)) {
    return new Proxy(
      {},
      {
        get: (_target, key) =>
          key === "__esModule"
            ? false
            : new Proxy(
                class {
                  constructor() {
                    return fake();
                  }
                },
                { apply: () => fake() },
              ),
      },
    );
  }
  return originalLoad.call(this, request, ...rest);
};

// ---------------------------------------------------------------------------
// 3. Fake browser / Obsidian globals the bundle touches while loading.
//    `window.moment` is real (Obsidian ships moment); the rest are fakes.
// ---------------------------------------------------------------------------
globalThis.window = globalThis;
globalThis.moment = require("moment");
// Node has its own read-only `navigator`; replace it rather than assign to it
Object.defineProperty(globalThis, "navigator", { value: { languages: ["en"] }, configurable: true });
for (const name of [
  "document", "activeDocument", "activeWindow",
  "createDiv", "createEl", "createSpan", "createFragment",
  "HTMLElement", "Element", "Node", "customElements", "getComputedStyle",
  "requestAnimationFrame", "ResizeObserver", "MutationObserver",
]) {
  if (!(name in globalThis)) globalThis[name] = fake();
}

// ---------------------------------------------------------------------------
// 4. Load the bundle as a CommonJS module.
//    (package.json has "type": "module", so a plain require() would treat main.js as ESM.)
// ---------------------------------------------------------------------------
try {
  const source = fs.readFileSync(bundlePath, "utf8");
  const bundle = new Module(bundlePath, module);
  bundle.filename = bundlePath;
  bundle.paths = Module._nodeModulePaths(path.dirname(bundlePath));
  bundle._compile(source, bundlePath);

  const PluginClass = bundle.exports.default ?? bundle.exports;
  if (typeof PluginClass !== "function") {
    throw new Error(`expected the plugin class as the default export, got ${typeof PluginClass}`);
  }
  console.log(`Load check passed: ${path.relative(process.cwd(), bundlePath)}`);
} catch (error) {
  console.error(`Load check FAILED: ${path.relative(process.cwd(), bundlePath)}`);
  console.error(`  ${error.constructor.name}: ${error.message}`);
  process.exitCode = 1;
} finally {
  // this script runs in its own process, but undo the loader patch anyway in case it's ever reused in-process
  Module._load = originalLoad;
}
