import type { IGranularity, TFileData } from '@/io';
import { createOrOpenNote, vaultSource } from "@/io";
import { Platform, TFile } from 'obsidian';
import { PluginService } from '@/app-service';
import { openNoteMenu, type NoteMenuParams } from '../note-menu';

type TOnClickParams = {
  date: moment.Moment;
  /** Calendared: Ctrl/Cmd held opens the note in a new tab (docs/adr/0048); upstream's name said "split" */
  inNewTab: boolean;
  granularity: IGranularity;
};
type TOnHoverParams = {
  event: PointerEvent | null;
  file: TFile | null;
};

// Calendared: the source registered with the 'Page preview' core plugin (docs/adr/0026)
export const HOVER_LINK_SOURCE = "calendared";

// Component event handlers
const onClick = async ({
  date,
  inNewTab,
  granularity,
}: TOnClickParams): Promise<void> => {
  const leaf = PluginService.getPlugin()?.app.workspace.getLeaf(inNewTab ? "tab" : false) ?? null;
  createOrOpenNote({
    leaf,
    date,
    granularity,
  }).catch(console.error);
};

// Calendared: Page preview decides whether Ctrl/Cmd is needed, from its own settings (docs/adr/0026)
const onHover = ({
  event,
  file,
}: TOnHoverParams): void => {
  if (event && file) {
    PluginService.getPlugin()?.app.workspace.trigger("hover-link", {
      event,
      source: HOVER_LINK_SOURCE,
      hoverParent: { hoverPopover: null },
      targetEl: event.target,
      linktext: file.path,
      sourcePath: file.path,
    });
  }
};

const onContextMenu = (params: NoteMenuParams): void => {
  openNoteMenu(params);
};

export const eventHandlers = {
  onClick,
  onHover,
  onContextMenu
}

export function isControlPressed(e: MouseEvent | KeyboardEvent): boolean {
  return Platform.isMacOS ? e.metaKey : e.ctrlKey;
}

/**
 * Calendared: what a button for a period's note does on a click (Ctrl/Cmd: in a new tab), a right-click (the note's
 * menu) and a hover (Page preview). The date buttons, the calendar's titles and the breadcrumbs wire them alike
 */
export function noteButtonEvents(granularity: IGranularity, date: moment.Moment, fileData: TFileData) {
  return {
    open: (event: MouseEvent) => onClick({ date, granularity, inNewTab: isControlPressed(event) }),
    menu: (event: MouseEvent) => onContextMenu({ event, fileData, date, granularity }),
    hover: (event: PointerEvent) => onHover({ event, file: fileData.file }),
  };
}

/**
 * Calendared: whether the file is the open note, as Obsidian knows it (docs/adr/0015). Read while rendering, it
 * changes when another note is opened
 */
export function isOpenNote(file: TFile | null): boolean {
  return !!file && vaultSource().activeFile()?.path === file.path;
}
