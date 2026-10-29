// Calendared: stand-in for the `obsidian` module in unit tests. The npm package only has type definitions;
// the real module comes from the Obsidian app. Add what a tested module needs at import time
export const normalizePath = (path: string) => path;
