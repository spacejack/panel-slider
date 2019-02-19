/**
 * Represents a renderable element for a Panel.
 */
interface Panel {
    /** This panel always references the same dom node */
    readonly dom: HTMLElement;
    /** Current panel index that renders to this panel */
    index: number;
    /** Rendered state of panel */
    state: Panel.State;
}
/** Creates a Panel instance */
declare function Panel(index: number, widthPct: number, state?: Panel.State, className?: string): Panel;
/** Additional Panel statics */
declare namespace Panel {
    type State = 0 | 1 | 2 | 3 | -1;
    const EMPTY: State;
    const PRERENDERED: State;
    const FETCHING: State;
    const RENDERED: State;
    const DIRTY: State;
    /** Creates a Panel DOM node */
    function createElement(className?: string, style?: {
        width?: string;
        transform?: string;
    }): HTMLDivElement;
}
export default Panel;
