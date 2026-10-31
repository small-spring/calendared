export type WindowEventHandler<K extends keyof WindowEventMap> = (ev: WindowEventMap[K]) => void;

export type TWindowEvents = {
    [K in keyof WindowEventMap]?: WindowEventHandler<K>;
};

