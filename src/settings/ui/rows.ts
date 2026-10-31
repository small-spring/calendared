// Calendared: pieces for the settings written as definitions (Obsidian 1.13, docs/adr/0020) that the definitions can't
// describe by themselves
import { type ExtraButtonComponent, type Setting, setIcon, ToggleComponent } from "obsidian";
import { type Component, mount, unmount } from "svelte";

/**
 * A description under a group's heading, and a toggle at its right (docs/adr/0033). Definitions only put icon buttons
 * there (`extraButtons`), so this takes the place of one. Runs when the group is first shown. A group with a toggle
 * keeps its settings in a group of their own right after: a group whose settings are all hidden is hidden with its
 * heading
 */
export function headingExtras(extras: {
  description?: string;
  toggle?: { isOn: () => boolean; onChange: (on: boolean) => void };
}) {
  return (button: ExtraButtonComponent) => {
    const controlEl = button.extraSettingsEl.parentElement;
    const headingEl = controlEl?.parentElement;
    const nameEl = headingEl?.querySelector(".setting-item-name");
    button.extraSettingsEl.remove();
    if (!controlEl || !headingEl || !nameEl) return;

    if (extras.description) {
      const infoEl = createDiv("setting-item-info");
      headingEl.prepend(infoEl);
      infoEl.append(nameEl);
      infoEl.createDiv({ cls: "setting-item-description", text: extras.description });
    }
    if (extras.toggle) {
      headingEl.addClass("mod-toggle");
      new ToggleComponent(controlEl).setValue(extras.toggle.isOn()).onChange(extras.toggle.onChange);
    }
  };
}

/** A setting's name with the icon of the button it is about (a button in the tab title bar), so the two can be matched */
export function nameWithIcon(icon: string, name: string): DocumentFragment {
  const fragment = createFragment();
  const el = fragment.createSpan({ cls: "calendared-setting-name-icon" });
  setIcon(el.createSpan(), icon);
  el.appendText(name);
  return fragment;
}

/**
 * Shows a Svelte component under a setting's name and description, as wide as the setting. Returns the cleanup the
 * definition's `render` hands back
 */
export function mountBelow<Props extends Record<string, unknown>>(
  setting: Setting,
  component: Component<Props>,
  props: Props,
): () => void {
  setting.settingEl.addClass("calendared-setting-stacked");
  const target = setting.settingEl.createDiv("calendared-setting-below");
  const view = mount(component, { target, props });
  return () => {
    void unmount(view);
    target.remove();
  };
}
