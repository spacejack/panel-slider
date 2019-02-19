export interface SwipeOptions {
    /** Current panel index */
    panelId: number;
    /** Current drag position in pixels (always a negative number) */
    x: number;
    /** Velocity of swipe in pixels/second */
    xv: number;
    /** Width of 1 panel in pixels */
    panelWidth: number;
    /** Maximum swipe panel travel */
    maxSwipePanels: number;
    /** Total # of panels */
    totalPanels: number;
    /** Typical duration of 1 panel swipe */
    unitDuration: number;
}
export interface SwipeResult {
    panelId: number;
    duration: number;
}
/**
 * Compute "throw" from swipe
 */
export declare function swipe({ panelId, x, xv, panelWidth, maxSwipePanels, totalPanels, unitDuration }: SwipeOptions): SwipeResult;
