/** Object provided to drag callbacks */
export interface Drag {
    /** Horizontal amount dragged from start (in pixels) */
    x: number;
    /** Current horizontal velocity */
    v: number;
}
export interface EventEmitters {
    dragstart: ((d: Drag) => void)[];
    drag: ((d: Drag) => void)[];
    dragend: ((d: Drag) => void)[];
    dragcancel: ((d: Drag) => void)[];
    animate: ((panelFraction: number) => void)[];
    animationstatechange: ((animating: boolean) => void)[];
    panelchange: ((panelId: number) => void)[];
}
export declare type EventName = keyof EventEmitters;
/**
 * Default animation interpolation function
 * @param x0 Start coordinate
 * @param x1 End coordinate
 * @param t Time (0..1)
 */
export declare function terpFn(x0: number, x1: number, t: number): number;
export interface PanelSliderOptions {
    /** The root element to use */
    element: HTMLElement;
    /** Number of panels the root element is divided into */
    numPanels: number;
    /** Starting panel */
    initialPanel?: number;
    /** Duration of slide animation on release (default 500ms) */
    slideDuration?: number;
    /** Horizontal distance threshold to initiate drag (default 12px) */
    dragThreshold?: number;
    /** Minimum required horizontal:vertical ratio to initiate drag (default 1.5) */
    dragRatio?: number;
    /** Input devices to enable (default ['mouse', 'touch']) */
    devices?: ('mouse' | 'touch')[];
    /**
     * Optional custom animation interpolation function
     * @param x0 Start coordinate
     * @param x1 End coordinate
     * @param t Time (0..1)
     */
    terp?(x0: number, x1: number, t: number): number;
}
/**
 * Public API returned by PanelSlider factory function
 */
interface PanelSlider {
    /** Add a listener that fires when drag starts */
    on(eventType: 'dragstart', cb: (d: Drag) => void): void;
    /** Remove dragstart listener */
    off(eventType: 'dragstart', cb: (d: Drag) => void): void;
    /** Add a listener that fires every move event while dragging */
    on(eventType: 'drag', cb: (d: Drag) => void): void;
    /** Remove drag listener */
    off(eventType: 'drag', cb: (d: Drag) => void): void;
    /** Add a listener that fires when drag ended */
    on(eventType: 'dragend', cb: (d: Drag) => void): void;
    /** Remove dragend listener */
    off(eventType: 'dragend', cb: (d: Drag) => void): void;
    /** Add a listener that fires when drag canceled */
    on(eventType: 'dragcancel', cb: (d: Drag) => void): void;
    /** Remove dragcancel listener */
    off(eventType: 'dragcancel', cb: (d: Drag) => void): void;
    /** Add a listener that fires every frame the panel moves */
    on(eventType: 'animate', cb: (panelFraction: number) => void): void;
    /** Remove animate listener */
    off(eventType: 'animate', cb: (panelFraction: number) => void): void;
    /** Add a listener that fires when animation starts or ends */
    on(eventType: 'animationstatechange', cb: (animating: boolean) => void): void;
    /** Remove animationstatechange listener */
    off(eventType: 'animationstatechange', cb: (animating: boolean) => void): void;
    /** Add a listener that fires when current panel has changed */
    on(eventType: 'panelchange', cb: (panelId: number) => void): void;
    /** Remove panelchange listener */
    off(eventType: 'panelchange', cb: (panelId: number) => void): void;
    /** Sets the current panel - animates to position */
    setPanel(panelId: number, done?: (panelId: number) => void): void;
    /** Gets the current panel */
    getPanel(): number;
    /** Gets the current root element & panel sizes */
    getSizes(): {
        fullWidth: number;
        panelWidth: number;
    };
    /** Returns whether panels are currently being dragged or not */
    isDragging(): boolean;
    /** Returns whether panels are currently animating or not */
    isAnimating(): boolean;
    /** Destroy & cleanup resources */
    destroy(): void;
}
/**
 * Drags an element horizontally between sections.
 */
declare function PanelSlider({element, numPanels, initialPanel, slideDuration, dragThreshold, dragRatio, devices, terp}: PanelSliderOptions): PanelSlider;
export default PanelSlider;
