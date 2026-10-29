import { LEAF_TYPE } from '@/constants';
import { TFile, WorkspaceLeaf, Platform } from 'obsidian';
import { PluginService } from '@/app-service';

export class ViewManager {
  static initView({ active }: { active: boolean } = { active: true }) {
    let mainLeaf = this.getMainLeaf();

    if (!mainLeaf) {
      mainLeaf = PluginService.getPlugin()?.app.workspace.getRightLeaf(false) ?? null;
    }
    mainLeaf?.setViewState({
      type: LEAF_TYPE,
      active
    }).catch(console.error);

    return mainLeaf;
  }

  static async revealView() {
    let leaf: WorkspaceLeaf | undefined | null = PluginService.getPlugin()?.app.workspace.getLeavesOfType(LEAF_TYPE)[0];
    if (!leaf) {
      leaf = this.initView()
    }

    if (leaf) {
      await PluginService.getPlugin()?.app.workspace.revealLeaf(leaf);
      await leaf.setViewState({
        type: LEAF_TYPE,
        active: true
      });
    }
  }

  /**
   * The worskpace split where leaf is currently attached to
   * based on closest `.workspace-split` className
   */
  static getLeafSplitPosition(workspaceLeaf: WorkspaceLeaf | null) {
    const leaf = workspaceLeaf as WorkspaceLeaf & { containerEl: HTMLElement; tabHeaderEl: HTMLElement } | null
    if (!leaf) return null;

    const closestWorkspaceClassname = Platform.isPhone ? ".workspace-drawer" : ".workspace-split"
    const closestWorkspaceSplitClassName =
      leaf?.containerEl.closest(closestWorkspaceClassname)?.className;

    if (closestWorkspaceSplitClassName?.includes('left')) {
      return 'left';
    }

    if (closestWorkspaceSplitClassName?.includes('right')) {
      return 'right';
    }

    return 'root';
  }

  static getLeafFilePath(workspaceLeaf: WorkspaceLeaf | null) {
    return workspaceLeaf?.view.getState().file as string | undefined || (workspaceLeaf?.view as unknown as { file?: { path?: string } })?.file?.path
  }

  static getMainLeaf() {
    return PluginService.getPlugin()?.app.workspace.getLeavesOfType(LEAF_TYPE)[0] as WorkspaceLeaf | null
  }

  static getFileFromLeaf(leaf?: WorkspaceLeaf | null, _file?: TFile) {
    if (!leaf) return;

    const leafFilepath = _file?.path || this.getLeafFilePath(leaf);
    if (!leafFilepath) return;

    const file = PluginService.getPlugin()?.app.vault.getAbstractFileByPath(leafFilepath);
    if (file && !(file instanceof TFile)) return;
    if (!file) return;

    return file
  }
}
