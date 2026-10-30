import { Component, mount } from "svelte";
import { Popover } from "./base";
import { arrow, autoUpdate, computePosition, flip } from "@floating-ui/dom";
import { MODAL_CLASS } from "@/constants";
import { type TWindowEvents, type WindowEventHandler } from "../types";

export abstract class BaseComponentBehavior {
  public componentHtmlEl: HTMLElement;
  public component: Record<string, unknown> | null;
  public autoUpdateCleanup: (() => void) | null | undefined;
  public boundCallbacks = new Map<keyof WindowEventMap, WindowEventHandler<keyof WindowEventMap>>();
  public opened = false;

  constructor(
    public id: string,
    view: {
      Component: Component;
      props?: Record<string, unknown>;
    },
    public cbs?: {
      onOpen?: () => void,
      onClose?: () => void,
    }
  ) {
    // Calendared: drop popovers a previous load of the plugin left behind (versions without onunload cleanup),
    // otherwise the lookup by id below finds the stale one instead of ours
    document.querySelectorAll(`#${id}[data-popover="true"]`).forEach((staleEl) => staleEl.remove());

    this.component = mount(view.Component, {
      target: document.body,
      props: {
        close: this.close.bind(this),
        ...view.props
      }
    });
    this.componentHtmlEl = document.querySelector(`#${id}[data-popover="true"]`) as HTMLElement;
    this.componentHtmlEl.addClass("pnc-popover");
  }

  public toggle(param: Element) {
    if (this.opened) {
      this.close()
    } else {
      this.open(param)
    }
  }

  public open(refHtmlEl: Element, positionFloatingUI = true) {
    this.opened = true;

    // close all popovers when a new modal is displayed to prevent overlapping
    if (!Popover.mutationObserverStarted) {
      const cb = (mutationRecords: MutationRecord[]) => {
        mutationRecords.forEach((record) => {
          const modalFound = [...record.addedNodes].find((node) => {
            if (node instanceof HTMLElement) {
              return node.className.contains(MODAL_CLASS);
            }
          });
          if (modalFound) {
            Popover.closeAll()

            mutationObserver.disconnect();
            Popover.mutationObserverStarted = false;
          }
        });
      };

      const mutationObserver = new MutationObserver(cb);
      mutationObserver.observe(document.querySelector('body') as HTMLBodyElement, {
        childList: true
      });
    }

    this.show()
    this.setInteractivity(true);

    if (positionFloatingUI) {
      this.positionComponent({ refHtmlEl });
      this.autoUpdateCleanup = autoUpdate(refHtmlEl, this.componentHtmlEl, () => {
        // Check if element is still connected to the DOM
        if (!refHtmlEl.isConnected) {
          // Clean up the autoUpdate
          this.autoUpdateCleanup?.();
          return;
        }

        try {
          // Additional safety check
          if (document.contains(refHtmlEl)) {
            this.positionComponent({ refHtmlEl });
          } else {
            this.autoUpdateCleanup?.();
          }
        } catch (error) {
          console.warn('Reference element no longer valid:', error);
          this.autoUpdateCleanup?.();
        }
      })
    }

    this.cbs?.onOpen?.();
  }
  public close() {
    this.opened = false;

    this.hide();
    this.setInteractivity(false);
    this.autoUpdateCleanup?.();
    this.autoUpdateCleanup = null;

    this.removeWindowListeners(this.getWindowEvents(), this.boundCallbacks);
    this.cbs?.onClose?.();
  }
  public cleanup() {
    // needed to avoid breaking inheritance
  }

  public positionComponent({
    refHtmlEl,
    customX,
    customY
  }: {
    refHtmlEl: Element;
    customX?: number;
    customY?: number;
  }) {
    const arrowEl = document.querySelector(`#${this.id}-arrow`) as HTMLDivElement;
    computePosition(refHtmlEl, this.componentHtmlEl, {
      placement: 'right-start',
      middleware: [flip(), arrow({ element: arrowEl })]
    }).then(({ x, y, placement, middlewareData }) => {
      Object.assign(this.componentHtmlEl.style, {
        left: `${customX || x}px`,
        top: `${customY || y}px`
      });
      // Handle Arrow Placement:
      // https://floating-ui.com/docs/arrow
      if (arrowEl && middlewareData.arrow) {
        const { x: arrowX, y: arrowY } = middlewareData.arrow;

        const staticSide = {
          top: 'bottom',
          right: 'left',
          bottom: 'top',
          left: 'right'
        }[placement.split('-')[0]];

        if (staticSide) {
          Object.assign(arrowEl.style, {
            left: arrowX != null ? `${arrowX}px` : '',
            top: arrowY != null ? `${arrowY}px` : '',
            right: '',
            bottom: '',
            [staticSide]: '9px'
          });
        }
      }
    }).catch(console.error);
  }

  public addWindowListeners(windowEvents: TWindowEvents, boundCallbacks: Map<keyof WindowEventMap, WindowEventHandler<keyof WindowEventMap>>) {
    (Object.entries(windowEvents) as [keyof WindowEventMap, WindowEventHandler<keyof WindowEventMap>][]).forEach(
      ([evName, cb]) => {
        if (cb) {
          // const boundCallback = cb.bind(popoverInstance);
          boundCallbacks.set(evName, cb);

          window.addEventListener(evName, cb);
        }
      }
    );
  }
  public removeWindowListeners(windowEvents: TWindowEvents, boundCallbacks: Map<keyof WindowEventMap, WindowEventHandler<keyof WindowEventMap>>) {
    (Object.entries(windowEvents) as [keyof WindowEventMap, WindowEventHandler<keyof WindowEventMap>][]).forEach(
      ([evName]) => {
        const cb = boundCallbacks.get(evName);
        if (cb) {
          window.removeEventListener(evName, cb);
        }
      }
    )
  }

  public abstract getWindowEvents(): TWindowEvents;

  private show() {
    this.componentHtmlEl.addClass("visible")
  }
  private hide() {
    this.componentHtmlEl.removeClass("visible")
  }
  private setInteractivity(enabled = true) {
    if (enabled) {
      this.componentHtmlEl.removeAttribute('inert');
    } else {
      this.componentHtmlEl.setAttribute('inert', '');
    }
  }
}
