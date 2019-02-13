/**
 * Represents a renderable element for a Panel.
 */
interface Panel {
	/** This panel always references the same dom node */
	readonly dom: HTMLElement
	/** Current panel index that renders to this panel */
	index: number
	/** Rendered state of panel */
	state: Panel.State
}

/** Creates a Panel instance */
function Panel (
	index: number, widthPct: number, state = Panel.EMPTY, className = ''
): Panel {
	const xpct = index * widthPct
	return {
		dom: Panel.createElement(className, {
			width: `${100}%`,
			transform: `translate3d(${xpct}%,0,0)`
		}),
		index,
		state
	}
}

/** Additional Panel statics */
namespace Panel {
	export type State = 0 | 1 | 2 | 3 | -1
	export const EMPTY      : State = 0
	export const PRERENDERED: State = 1
	export const FETCHING   : State = 2
	export const RENDERED   : State = 3
	export const DIRTY      : State = -1

	/** Creates a Panel DOM node */
	export function createElement(className = '', style: {width?: string, transform?: string} = {}) {
		const el = document.createElement('div')
		if (className) {
			el.className = className
		}
		Object.assign(el.style, {
			position: 'absolute',
			left: '0',
			top: '0',
			width: '100%',
			height: '100%',
			transform: 'translate3d(0,0,0)'
		}, style)
		return el
	}
}

export default Panel
