import type { App } from "obsidian";

declare global {
    interface Window {
        app: App;
        moment: moment.Moment;
    }
}

export * from './notice'
export * from './components';
