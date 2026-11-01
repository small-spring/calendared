import 'obsidian';

export type IGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type IPeriodicity = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

declare module 'obsidian' {
  interface App {
    internalPlugins: {
      getPluginById<T = unknown>(id: string): T | undefined;
    }
    setting?: {
      activeTab?: Record<string, unknown>;
      close?: () => void;
    }
  }
  interface View {
    revealInFolder: (file: TFile) => void;
  }
  interface Vault {
    getAvailablePath: (path: string, extension: string) => string;
  }

  interface WorkspaceLeaf {
    id: string;
    containerEl?: HTMLElement;
  }
}
