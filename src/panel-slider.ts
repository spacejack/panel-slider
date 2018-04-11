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

export interface Options {
	el: HTMLElement
	numPanels: number
	initialPanel: number
	slideDuration?: number
	dragThreshold?: number
	dragRatio?: number
}

interface PanelSlider {
	on (eventType: 'dragstart', cb: (dx: number) => void): void
	on (eventType: 'drag', cb: (dx: number, vx: number) => void): void
	on (eventType: 'dragend', cb: (dx: number, vx: number) => void): void
	on (eventType: 'change', cb: (panelId: number) => void): void
	setPanel (panelId: number, done?: (panelId: number) => void): void
	getPanel(): number
	destroy(): void
	getSizes(): {fullWidth: number, panelWidth: number}
}

/**
 * Drags an element horizontally between sections.
 */
function PanelSlider ({
	el, numPanels, initialPanel,
	slideDuration = DEFAULT_SLIDE_DURATION,
	dragThreshold, dragRatio
}: Options): PanelSlider {
	const callbacks: Callbacks = {}
	// Will be computed on resize
	let fullWidth = numPanels
	let panelWidth = 1
	let curPanel = initialPanel
	let curPosX = 0
	let isAnimating = false

	resize()

	const dragger = Dragger(el, {
		dragThreshold, dragRatio,
		ondragmove(dx, dvx) {
			const ox = -curPanel * panelWidth
			curPosX = Math.round(clamp(ox + dx, -(fullWidth - panelWidth), 0))
			setX(el, curPosX)
		},
		ondragcancel() {
			swipeAnim(0, callbacks.change)
		},
		ondragend (dx, dvx) {
			const ox = -curPanel * panelWidth
			curPosX = Math.round(clamp(ox + dx, -(fullWidth - panelWidth), 0))
			setX(el, curPosX)
			swipeAnim(dvx, callbacks.change)
			callbacks.dragend && callbacks.dragend(dx, dvx)
		},
		ondevicepress() {
			// Ensure that we have up-to-date dimensions whenever
			// a drag action may start.
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
			setX(el, curPosX)
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
		const rc = el.getBoundingClientRect()
		panelWidth = rc.width
		fullWidth = panelWidth * numPanels
		curPosX = -curPanel * panelWidth
		setX(el, curPosX)
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
		el = undefined as any
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
