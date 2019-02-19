declare type DraggerEventType = 'dragstart' | 'dragmove' | 'dragend' | 'dragcancel' | 'devicepress' | 'devicerelease';
export declare class DraggerEvent {
    type: DraggerEventType;
    constructor(type: DraggerEventType);
}
export declare class DraggerDragEvent extends DraggerEvent {
    x: number;
    xv: number;
    constructor(type: 'dragstart' | 'dragmove' | 'dragend', x: number, xv: number);
}
export interface DraggerEventListeners {
    /** Fires when dragThreshold exceeded and element is in 'dragging' state */
    dragstart?(e: DraggerDragEvent): void;
    /** Fires for every move made while dragged */
    dragmove?(e: DraggerDragEvent): void;
    /** Fires when drag ends */
    dragend?(e: DraggerDragEvent): void;
    /** Fires if drag was started then cancelled */
    dragcancel?(e: DraggerEvent): void;
    /** Fires when input device pressed */
    devicepress?(e: MouseEvent | TouchEvent): void;
    /** Fires when input device released */
    devicerelease?(e: MouseEvent | TouchEvent): void;
}
export interface DraggerOptions {
    /** Specify drag threshold distance */
    dragThreshold?: number;
    /** Specifiy minimum drag ratio */
    dragRatio?: number;
    /** Devices to accept input from (default ['mouse', 'touch']) */
    devices?: ('mouse' | 'touch')[];
    on?: DraggerEventListeners;
    /** Maximum left drag amount */
    maxLeft?(): number;
    /** Maximum left drag amount */
    maxRight?(): number;
}
/**
 * Given a dom element, emit 'drag' events that occur along the horizontal axis
 */
declare function Dragger(el: HTMLElement, { on, dragThreshold, dragRatio, devices, maxLeft, maxRight }?: DraggerOptions): {
    isDragging: () => boolean;
    destroy: () => void;
};
declare type Dragger = ReturnType<typeof Dragger>;
export default Dragger;
