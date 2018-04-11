import Dragger from './dragger'
import {setX} from './transform'
import {clamp, terpIn} from './math'

export interface Callbacks {
	dragstart?: (dx: number) => void
	drag?: (dx: number, vx: number) => void
	dragend?: (dx: number, vx: number) => void
	change?: (panelId: number) => void
}

export type EventTypes = keyof Callbacks

const DEFAULT_SLIDE_DURATION = 500

export interface PanelSliderOptions {
	/** The root element to use */
	element: HTMLElement
	/** Number of panels the root element is divided into */
	numPanels: number
	/** Starting panel */
	initialPanel?: number
	/** Duration of slide animation (default 500ms) */
	slideDuration?: number
	/** Horizontal drag distance threshold (default 12px) */
	dragThreshold?: number
	/** Required minimum horizontal:vertical ratio (default 1.5) */
	dragRatio?: number
}

interface PanelSlider {
	/** Fires when drag starts */
	on (eventType: 'dragstart', cb: (dx: number) => void): void
	/** Fires every move event while dragging */
	on (eventType: 'drag', cb: (dx: number, vx: number) => void): void
	/** Fires when drag ended */
	on (eventType: 'dragend', cb: (dx: number, vx: number) => void): void
	/** Fires when current panel has changed */
	on (eventType: 'change', cb: (panelId: number) => void): void
	/** Sets the current panel - animates to position */
	setPanel (panelId: number, done?: (panelId: number) => void): void
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
	dragThreshold, dragRatio
}: PanelSliderOptions): PanelSlider {
	const callbacks: Callbacks = {}
	// Will be computed on resize
	let fullWidth = numPanels
	let panelWidth = 1
	let curPanel = initialPanel
	let curPosX = 0
	let isAnimating = false

	resize()

	const dragger = Dragger(element, {
		dragThreshold, dragRatio,
		ondragmove(dx, dvx) {
			const ox = -curPanel * panelWidth
			curPosX = Math.round(clamp(ox + dx, -(fullWidth - panelWidth), 0))
			setX(element, curPosX)
		},
		ondragcancel() {
			swipeAnim(0, callbacks.change)
		},
		ondragend (dx, dvx) {
			const ox = -curPanel * panelWidth
			curPosX = Math.round(clamp(ox + dx, -(fullWidth - panelWidth), 0))
			setX(element, curPosX)
			swipeAnim(dvx, callbacks.change)
			callbacks.dragend && callbacks.dragend(dx, dvx)
		},
		ondevicepress() {
			// Ensure we have up-to-date dimensions whenever a drag action
			// may start in case we missed a stealth window resize.
			resize()
		}
	})

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
			curPosX = terpIn(startX, destX, animT / dur)
			setX(element, curPosX)
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
		eventType: EventTypes,
		cb: (dx: number, dy: number) => void
	) {
		// TODO: Add multiple callbacks instead of replace?
		callbacks[eventType] = cb
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
		callbacks.dragstart = undefined
		callbacks.drag = undefined
		callbacks.dragend = undefined
		callbacks.change = undefined
		element = undefined as any
	}

	window.addEventListener('resize', resize)

	return {
		/** Add an event listener */
		on,
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
