import Dragger from './dragger'
import {setX} from './transform'
import {clamp} from './math'

const DEFAULT_SLIDE_DURATION = 500

/** Object provided to drag callbacks */
export interface Drag {
	/** Horizontal amount dragged from start (in pixels) */
	x: number
	/** Current horizontal velocity */
	v: number
}

export interface EventEmitters {
	dragstart: ((d: Drag) => void)[]
	drag: ((d: Drag) => void)[]
	dragend: ((d: Drag) => void)[]
	animate: ((panelFraction: number) => void)[]
	panelchange: ((panelId: number) => void)[]
}

export type EventName = keyof EventEmitters

/**
 * Default animation interpolation function
 * @param x0 Start coordinate
 * @param x1 End coordinate
 * @param t Time (0..1)
 */
export function terpFn (x0: number, x1: number, t: number): number {
	const r = (Math.PI / 2.0) * t
	const s = Math.sin(r)
	const si = 1.0 - s
	return (x0 * si + x1 * s)
}

export interface PanelSliderOptions {
	/** The root element to use */
	element: HTMLElement
	/** Number of panels the root element is divided into */
	numPanels: number
	/** Starting panel */
	initialPanel?: number
	/** Duration of slide animation on release (default 500ms) */
	slideDuration?: number
	/** Horizontal distance threshold to initiate drag (default 12px) */
	dragThreshold?: number
	/** Minimum required horizontal:vertical ratio to initiate drag (default 1.5) */
	dragRatio?: number
	/** Input devices to enable (default ['mouse', 'touch']) */
	devices?: ('mouse' | 'touch')[]
	/**
	 * Optional custom animation interpolation function
	 * @param x0 Start coordinate
	 * @param x1 End coordinate
	 * @param t Time (0..1)
	 */
	terp?(x0: number, x1: number, t: number): number
}

/**
 * Public API returned by PanelSlider factory function
 */
interface PanelSlider {
	/** Add a listener that fires when drag starts */
	on(eventType: 'dragstart', cb: (d: Drag) => void): void
	/** Remove dragstart listener */
	off(eventType: 'dragstart', cb: (d: Drag) => void): void
	/** Add a listener that fires every move event while dragging */
	on(eventType: 'drag', cb: (d: Drag) => void): void
	/** Remove drag listener */
	off(eventType: 'drag', cb: (d: Drag) => void): void
	/** Add a listener that fires when drag ended */
	on(eventType: 'dragend', cb: (d: Drag) => void): void
	/** Remove dragend listener */
	off(eventType: 'dragend', cb: (d: Drag) => void): void
	/** Add a listener that fires every frame the panel moves */
	on(eventType: 'animate', cb: (panelFraction: number) => void): void
	/** Remove animate listener */
	off(eventType: 'animate', cb: (panelFraction: number) => void): void
	/** Add a listener that fires when current panel has changed */
	on(eventType: 'panelchange', cb: (panelId: number) => void): void
	/** Remove panelchange listener */
	off(eventType: 'panelchange', cb: (panelId: number) => void): void
	/** Sets the current panel - animates to position */
	setPanel(panelId: number, done?: (panelId: number) => void): void
	/** Gets the current panel */
	getPanel(): number
	/** Gets the current root element & panel sizes */
	getSizes(): {fullWidth: number, panelWidth: number}
	/** Destroy & cleanup resources */
	destroy(): void
}

/**
 * Drags an element horizontally between sections.
 */
function PanelSlider ({
	element,
	numPanels, initialPanel = 0,
	slideDuration = DEFAULT_SLIDE_DURATION,
	dragThreshold, dragRatio, devices,
	terp = terpFn
}: PanelSliderOptions): PanelSlider {
	const emitters: EventEmitters = {
		dragstart: [],
		drag: [],
		dragend: [],
		animate: [],
		panelchange: []
	}
	// Will be computed on resize
	let fullWidth = numPanels
	let panelWidth = 1
	let curPanel = initialPanel
	let curPosX = 0
	let isAnimating = false

	resize()

	const dragger = Dragger(element, {
		dragThreshold, dragRatio,
		devices,
		ondragstart (dx) {
			emit('dragstart', {x: dx, v: 0})
		},
		ondragmove(dx, dvx) {
			const ox = -curPanel * panelWidth
			curPosX = Math.round(clamp(ox + dx, -(fullWidth - panelWidth), 0))
			setX(element, curPosX)
			emit('animate', -curPosX / panelWidth)
			emit('drag', {x: dx, v: dvx})
		},
		ondragcancel() {
			swipeAnim(0, pid => {emit('panelchange', pid)})
		},
		ondragend (dx, dvx) {
			const ox = -curPanel * panelWidth
			curPosX = Math.round(clamp(ox + dx, -(fullWidth - panelWidth), 0))
			setX(element, curPosX)
			swipeAnim(dvx, pid => {emit('panelchange', pid)})
			emit('animate', -curPosX / panelWidth)
			emit('dragend', {x: dx, v: dvx})
		},
		ondevicepress() {
			// Ensure we have up-to-date dimensions whenever a drag action
			// may start in case we missed a stealth window resize.
			resize()
		}
	})

	function emit (n: EventName, value: any) {
		const arr = emitters[n] as any[]
		for (let i = 0; i < arr.length; ++i) {
			arr[i](value)
		}
	}

	function swipeAnim (xvel: number, done?: (panelId: number) => void) {
		const x = curPosX + xvel * 0.5
		let destination = clamp(Math.round(-x / panelWidth), 0, numPanels - 1)
		const p0 = curPanel
		if (destination - p0 > 1) destination = p0 + 1
		else if (p0 - destination > 1) destination = p0 - 1
		const dur = clamp(
			slideDuration - (slideDuration * (Math.abs(xvel / 10.0) / panelWidth)),
			17, slideDuration
		)
		animateTo(destination, dur, done)
	}

	function animateTo (
		destPanel: number, dur = slideDuration, done?: (panelId: number) => void
	) {
		if (isAnimating) {
			console.warn("Cannot animateTo - already animating")
			return
		}
		isAnimating = true
		const startX = curPosX
		const destX = -destPanel * panelWidth
		if (destX === startX) {
			if (destPanel !== curPanel) curPanel = destPanel
			done && requestAnimationFrame(() => {
				done(curPanel)
			})
			isAnimating = false
			return
		}
		const startT = Date.now()
		function loop() {
			const t = Date.now()
			const destX = -destPanel * panelWidth
			const totalT = t - startT
			const animT = Math.min(totalT, dur)
			curPosX = terp(startX, destX, animT / dur)
			setX(element, curPosX)
			emit('animate', -curPosX / panelWidth)
			if (totalT < dur) {
				requestAnimationFrame(loop)
			} else {
				curPanel = destPanel
				isAnimating = false
				done && done(curPanel)
			}
		}
		requestAnimationFrame(loop)
	}

	/** Update our full width and panel width on resize */
	function resize() {
		const rc = element.getBoundingClientRect()
		panelWidth = rc.width
		fullWidth = panelWidth * numPanels
		curPosX = -curPanel * panelWidth
		setX(element, curPosX)
	}

	///////////////////////////////////////////////////////
	// Public

	/** Add an event listener */
	function on (
		n: EventName,
		fn: ((d: Drag) => void) | ((id: number) => void)
	) {
		const arr = emitters[n] as any[]
		if (arr.indexOf(fn) === -1) {
			arr.push(fn)
		}
	}

	/** Remove an event listener */
	function off (
		n: EventName,
		fn: ((d: Drag) => void) | ((id: number) => void)
	) {
		const arr = emitters[n] as any[]
		const i = arr.indexOf(fn)
		if (i >= 0) {
			arr.splice(i, 1)
		}
	}

	/** Returns current panel index */
	function getPanel() {
		return curPanel
	}

	/** Sets current panel index, animates to position */
	function setPanel (panelId: number, done?: (panelId: number) => void) {
		if (panelId === curPanel) return
		animateTo(panelId, slideDuration, done)
	}

	/** Remove all event handlers, cleanup streams etc. */
	function destroy() {
		// Remove event listeners
		window.removeEventListener('resize', resize)
		dragger.destroy()
		emitters.dragstart.length = 0
		emitters.drag.length = 0
		emitters.dragend.length = 0
		emitters.panelchange.length = 0
		element = undefined as any
	}

	window.addEventListener('resize', resize)

	return {
		/** Add an event listener */
		on,
		/** Remove an event listener */
		off,
		/** Remove all event handlers, cleanup etc. */
		destroy,
		/** Returns current panel index */
		getPanel,
		/** Sets current panel index, animates to position */
		setPanel,
		/** Current sizes */
		getSizes: () => ({fullWidth, panelWidth})
	}
}

export default PanelSlider
