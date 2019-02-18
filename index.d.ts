/**
 * Allows a user to drag a set of panels horizontally across a viewport.
 */
interface PanelSlider {
    /** Add a listener that fires when drag starts */
    on(eventType: 'dragstart', cb: (e: PanelSlider.DragEvent) => void): void;
    /** Remove dragstart listener */
    off(eventType: 'dragstart', cb: (e: PanelSlider.DragEvent) => void): void;
    /** Add a listener that fires every move event while dragging */
    on(eventType: 'drag', cb: (e: PanelSlider.DragEvent) => void): void;
    /** Remove drag listener */
    off(eventType: 'drag', cb: (e: PanelSlider.DragEvent) => void): void;
    /** Add a listener that fires when drag ended */
    on(eventType: 'dragend', cb: (e: PanelSlider.DragEvent) => void): void;
    /** Remove dragend listener */
    off(eventType: 'dragend', cb: (e: PanelSlider.DragEvent) => void): void;
    /** Add a listener that fires when drag canceled */
    on(eventType: 'dragcancel', cb: (e: PanelSlider.DragEvent) => void): void;
    /** Remove dragcancel listener */
    off(eventType: 'dragcancel', cb: (e: PanelSlider.DragEvent) => void): void;
    /** Add a listener that fires every frame the panel moves */
    on(eventType: 'animate', cb: (e: PanelSlider.AnimateEvent) => void): void;
    /** Remove animate listener */
    off(eventType: 'animate', cb: (e: PanelSlider.AnimateEvent) => void): void;
    /** Add a listener that fires when animation starts or ends */
    on(eventType: 'animationstatechange', cb: (e: PanelSlider.AnimationEvent) => void): void;
    /** Remove animationstatechange listener */
    off(eventType: 'animationstatechange', cb: (e: PanelSlider.AnimationEvent) => void): void;
    /** Add a listener that fires when current panel has changed */
    on(eventType: 'panelchange', cb: (e: PanelSlider.ChangeEvent) => void): void;
    /** Remove panelchange listener */
    off(eventType: 'panelchange', cb: (e: PanelSlider.ChangeEvent) => void): void;
    /** Gets the current panel */
    getPanel(): number;
    /**
     * Sets the current panel - animates to position.
     * @param panelId The panel index to go to
     * @param duration Duration in ms. If omitted, the configured default is used.
     */
    setPanel(panelId: number, duration?: number): Promise<number>;
    /** Sets the current panel immediately, no animation */
    setPanelImmediate(panelId: number): void;
    /** Gets the current root element & panel sizes */
    getSizes(): {
        fullWidth: number;
        panelWidth: number;
    };
    /** Returns whether panels are currently being dragged or not */
    isDragging(): boolean;
    /** Returns whether panels are currently animating or not */
    isAnimating(): boolean;
    /**
     * Triggers a render for the given panelId (or all panels if no index is provided.)
     * The render will only occur if this panel index is in the render cache.
     * Returns true if the render was performed otherwise false.
     */
    render(panelId?: number): boolean;
    /**
     * PanelSlider listens for window resize events, however if your application resizes
     * the container element you should call this method to ensure panel sizes and positions
     * are maintained correctly
     */
    resize(): void;
    /** Destroy & cleanup resources */
    destroy(): void;
}
/**
 * Creates a PanelSlider instance.
 */
declare function PanelSlider(cfg: PanelSlider.Options): PanelSlider;
/**
 * PanelSlider static methods and properties.
 */
declare namespace PanelSlider {
    const DEFAULT_SLIDE_DURATION = 500;
    const DEFAULT_DRAG_THRESHOLD = 12;
    const DEFAULT_DRAG_RATIO = 1.5;
    /**
     * Default animation interpolation function
     * @param x0 Start coordinate
     * @param x1 End coordinate
     * @param t Time (0..1)
     */
    function terp(x0: number, x1: number, t: number): number;
    /** Lightweight PanelSlider Event type */
    class Event {
        type: EventType;
        constructor(type: EventType);
    }
    /** Event emitted when current panel changes */
    class ChangeEvent extends Event {
        panelId: number;
        constructor(type: 'panelchange', panelId: number);
    }
    /** Event emitted when current panel dragged */
    class DragEvent extends Event {
        /** Horizontal amount dragged from start (in pixels) */
        x: number;
        /** Current horizontal velocity */
        xv: number;
        constructor(type: 'drag' | 'dragstart' | 'dragend' | 'dragcancel', x: number, xv: number);
    }
    /** Emitted on animation start/stop */
    class AnimationEvent extends Event {
        animating: boolean;
        constructor(type: 'animationstatechange', animating: boolean);
    }
    /** Emitted every frame during an animation */
    class AnimateEvent extends Event {
        panelFraction: number;
        constructor(type: 'animate', panelFraction: number);
    }
    /** Received by the application's `renderContent` callback */
    class RenderEvent {
        type: 'render' | 'preview';
        dom: HTMLElement;
        panelId: number;
        constructor(type: 'render' | 'preview', dom: HTMLElement, panelId: number);
    }
    /** Return value from application `renderContent` callback */
    type RenderResult = 0 | 1 | 2 | 3 | -1;
    /** Indicates the panel is empty after renderContent */
    const EMPTY: RenderResult;
    /** Indicates the panel is 'pre-rendered' after renderContent */
    const PRERENDERED: RenderResult;
    /** Indicates the panel is 'pre-rendered' and awaiting content after renderContent */
    const FETCHING: RenderResult;
    /** Indicates the panel is fully rendered */
    const RENDERED: RenderResult;
    /** Indicates the panel content is out of date and needs to re-render */
    const DIRTY: RenderResult;
    /** Event Listener signature */
    type EventListener = (e: Event) => void;
    interface EventListeners {
        dragstart?(e: DragEvent): void;
        drag?(e: DragEvent): void;
        dragend?(e: DragEvent): void;
        dragcancel?(e: DragEvent): void;
        animate?(e: AnimateEvent): void;
        animationstatechange?(e: AnimationEvent): void;
        panelchange?(e: ChangeEvent): void;
    }
    interface EventEmitters {
        dragstart: ((e: DragEvent) => void)[];
        drag: ((e: DragEvent) => void)[];
        dragend: ((e: DragEvent) => void)[];
        dragcancel: ((e: DragEvent) => void)[];
        animate: ((e: AnimateEvent) => void)[];
        animationstatechange: ((e: AnimationEvent) => void)[];
        panelchange: ((e: ChangeEvent) => void)[];
    }
    /** Event types */
    type EventType = keyof EventEmitters;
    /** PanelSlider creation options */
    interface Options {
        /**
         * The root DOM element to use. It should be empty and
         * panel child elements will be added to it.
         */
        dom: HTMLElement;
        /** Total number of panels with content */
        totalPanels: number;
        /** Total number of visible panels that fit across the width of panel-set container */
        visiblePanels?: number;
        /** Starting panel */
        initialPanel?: number;
        /** Maximum panels travelled from swipe (default visiblePanels) */
        maxSwipePanels?: number;
        /** Duration of slide animation on release (default 500ms) */
        slideDuration?: number;
        /** Horizontal distance threshold to initiate drag (default 12px) */
        dragThreshold?: number;
        /** Minimum required horizontal:vertical ratio to initiate drag (default 1.5) */
        dragRatio?: number;
        /** Input devices to enable (default ['mouse', 'touch']) */
        devices?: ('mouse' | 'touch')[];
        /** CSS className to use for the panel elements */
        panelClassName?: string;
        /** Initial event listeners */
        on?: EventListeners;
        /** Application function to render a panel */
        renderContent(event: RenderEvent): PanelSlider.RenderResult;
        /**
         * Optional custom animation interpolation function
         * @param x0 Start coordinate
         * @param x1 End coordinate
         * @param t Time (0..1)
         * @returns Interpolated value between x0 (t=0) and x1 (t=1)
         */
        terp?(x0: number, x1: number, t: number): number;
    }
}
export default PanelSlider;
