// Calendared: stand-in for the `obsidian` module in unit tests. The npm package only has type definitions;
// the real module comes from the Obsidian app. Add what a tested module needs at import time

/** Like Obsidian's: one kind of slash, no slash at either end ("/" for the vault root), no non-breaking spaces, NFC */
export const normalizePath = (path: string) =>
    (path.replace(/[\\/]+/g, "/").replace(/^\/+|\/+$/g, "") || "/").replace(/\u00A0|\u202F/g, " ").normalize("NFC");

export class TAbstractFile {
    path = "";
}
export class TFile extends TAbstractFile {}
export class TFolder extends TAbstractFile {}
export class Notice {
    /** the messages shown so far, for tests to read */
    static shown: unknown[] = [];
    constructor(public message: unknown) {
        Notice.shown.push(message);
    }
}
