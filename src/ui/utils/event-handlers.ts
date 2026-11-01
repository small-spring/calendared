import type { IGranularity } from '@/io';
import { createOrOpenNote } from "@/io";
import { TFile } from 'obsidian';
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
