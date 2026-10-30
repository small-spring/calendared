import type { IGranularity } from '@/io';
import { createOrOpenNote } from "@/io";
import { TFile } from 'obsidian';
import { PluginService } from '@/app-service';
import { openNoteMenu, type NoteMenuParams } from '../note-menu';

type TOnClickParams = {
  date: moment.Moment;
  createNewSplitLeaf: boolean;
  granularity: IGranularity;
  openState?: Record<string, unknown>;
};
type TOnHoverParams = {
  event: PointerEvent | null;
  isControlPressed: boolean;
  file: TFile | null;
};

// Component event handlers
const onClick = async ({
  date,
  createNewSplitLeaf,
  granularity,
  openState,
}: TOnClickParams): Promise<void> => {
  const leaf = PluginService.getPlugin()?.app.workspace.getLeaf(createNewSplitLeaf) ?? null;
  createOrOpenNote({
    leaf,
    date,
    openState,
    granularity,
  }).catch(console.error);
};

const onHover = ({
  event,
  isControlPressed,
  file,
}: TOnHoverParams): void => {
  if (event && file && isControlPressed) {
    // https://forum.obsidian.md/t/internal-links-dont-work-in-custom-view/90169/2
    PluginService.getPlugin()?.app.workspace.trigger("hover-link", {
      event,
      source: "preview",
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
