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
    /** Sets the current panel - animates to position */
    setPanel(panelId: number, done?: (panelId: number) => void): void;
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
     * Forces a renderContent for the given panel ID (or all if none.)
     * The render will only occur if this panel Id is in the render cache.
     * Returns true if the render is performed otherwise false.
     */
    renderContent(panelId: number): boolean;
    /** Destroy & cleanup resources */
    destroy(): void;
}
/**
 * Creates a PanelSlider instance.
 */
declare function PanelSlider({ dom, totalPanels, visiblePanels, initialPanel, slideDuration, dragThreshold, dragRatio, devices, on, renderContent, terp }: PanelSlider.Options): PanelSlider;
/**
 * PanelSlider static methods and properties.
 */
declare namespace PanelSlider {
    const DEFAULT_SLIDE_DURATION = 500;
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
        /** The root element to use */
        dom: HTMLElement;
        /** Total number of panels */
        totalPanels: number;
        /** Total number of visible panels that fit across the width of panel-set container */
        visiblePanels: number;
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
        /** Initial event listeners */
        on?: EventListeners;
        /** Application function to render a panel */
        renderContent(dom: HTMLElement, panelIndex: number, fast?: boolean): void;
        /**
         * Optional custom animation interpolation function
         * @param x0 Start coordinate
         * @param x1 End coordinate
         * @param t Time (0..1)
         */
        terp?(x0: number, x1: number, t: number): number;
    }
}
export default PanelSlider;
