import createSpeedo from './speedo'
import {setX} from './transform'
import {clamp, terpIn} from './math'

export interface Callbacks {
	dragstart?: (dx: number) => void
	drag?: (dx: number, vx: number) => void
	dragend?: (dx: number, vx: number) => void
	change?: (panelId: number) => void
}

type EventTypes = keyof Callbacks

const DEFAULT_DRAG_THRESHOLD  = 15
const DEFAULT_RATIO_THRESHOLD = 2.0
const DEFAULT_SLIDE_DURATION  = 500

export interface PanelSlider {
	on (eventType: 'dragstart', cb: (dx: number) => void): void
	on (eventType: 'drag', cb: (dx: number, vx: number) => void): void
	on (eventType: 'dragend', cb: (dx: number, vx: number) => void): void
	on (eventType: 'change', cb: (panelId: number) => void): void
	setPanel (panelId: number, done?: (panelId: number) => void): void
	getPanel(): number
	destroy(): void
	size: {fullWidth: number, panelWidth: number}
}

export interface Options {
	el: HTMLElement
	numPanels: number
	initialPanel: number
	scrollables?: Node[]
	slideDuration?: number
	dragThreshold?: number
	ratioThreshold?: number
}

/**
 * Drags an element horizontally between sections.
 */
export default function createPanelSlider ({
	el, numPanels, initialPanel, scrollables,
	slideDuration = DEFAULT_SLIDE_DURATION,
	dragThreshold = DEFAULT_DRAG_THRESHOLD,
	ratioThreshold = DEFAULT_RATIO_THRESHOLD
}: Options): PanelSlider {
	const callbacks: Callbacks = {}
	const pressStart = {x: 0, y: 0}
	const size = {fullWidth: numPanels, panelWidth: 1}
	const speedo = createSpeedo()
	let isPressed = false
	let isDragging = false
	let curPanel = initialPanel
	let curPosX = 0
	let isAnimating = false
	let isScrolling = false

	;(function init() {
		onResize()

		// Setup touch listeners
		el.addEventListener('touchstart', onTouchStart)
		el.addEventListener('touchmove', onTouchMove)
		el.addEventListener('touchend', onTouchEnd)

		// Setup scroll listeners
		if (scrollables) {
			scrollables.forEach(scroller => {
				scroller.addEventListener('scroll', onScrollerScroll)
				scroller.addEventListener('touchmove', onScrollerMove)
			})
		}

		// Resize listener
		window.addEventListener('resize', onResize)
	}())

	// Event handlers
	function onTouchStart (e: TouchEvent) {
		const touch = e.changedTouches[0]
		onPress(touch)
	}

	function onTouchMove (e: TouchEvent) {
		const touch = e.changedTouches[0]
		onMove(touch)
	}

	function onTouchEnd (e: TouchEvent) {
		const touch = e.changedTouches[0]
		onRelease(touch)
	}

	function onScrollerScroll (e: UIEvent) {
		if (isDragging) return
		isScrolling = true
		isPressed = false
		isDragging = false
	}

	function onScrollerMove (e: TouchEvent) {
		if (isDragging) e.preventDefault()
	}

	// Drag functions

	function tryStartDrag (touch: Touch) {
		speedo.start(0, Date.now() / 1000)
		const dx = touch.clientX - pressStart.x
		const dy = touch.clientY - pressStart.y
		const ratio = dy !== 0 ? Math.abs(dx / dy) : 100000.0
		if (Math.abs(dx) > dragThreshold && ratio > ratioThreshold) {
			isDragging = true
			callbacks.dragstart && callbacks.dragstart(dx)
		}
	}

	function onPress (touch: Touch) {
		isDragging = false
		isPressed = true
		isScrolling = false
		pressStart.x = touch.clientX
		pressStart.y = touch.clientY
	}

	function onMove (touch: Touch) {
		if (!isPressed) return
		if (isDragging) {
			drag(touch)
			return
		}
		if (!isScrolling) tryStartDrag(touch)
	}

	function onRelease (touch: Touch) {
		isPressed = false
		if (!isDragging) return
		isDragging = false
		endDrag(touch)
	}

	function drag (touch: Touch) {
		const dx = touch.clientX - pressStart.x
		speedo.addSample(dx, Date.now() / 1000)
		const ox = -curPanel * size.panelWidth
		curPosX = Math.round(clamp(ox + dx, -(size.fullWidth - size.panelWidth), 0))
		setX(el, curPosX)
		callbacks.drag && callbacks.drag(dx, speedo.getVel())
	}

	function endDrag (touch: Touch) {
		const dx = touch.clientX - pressStart.x
		speedo.addSample(dx, Date.now() / 1000)
		const ox = -curPanel * size.panelWidth
		curPosX = Math.round(clamp(ox + dx, -(size.fullWidth - size.panelWidth), 0))
		setX(el, curPosX)
		const xvel = speedo.getVel()
		swipeAnim(xvel, callbacks.change)
		callbacks.dragend && callbacks.dragend(dx, xvel)
	}

	function swipeAnim (xvel: number, done?: (panelId: number) => void) {
		const x = curPosX + xvel * 0.5
		let destination = clamp(Math.round(-x / size.panelWidth), 0, numPanels - 1)
		const p0 = curPanel
		if (destination - p0 > 1) destination = p0 + 1
		else if (p0 - destination > 1) destination = p0 - 1
		const dur = clamp(
			slideDuration - (slideDuration * (Math.abs(xvel / 10.0) / size.panelWidth)),
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
		const destX = -destPanel * size.panelWidth
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
			const destX = -destPanel * size.panelWidth
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

	function onResize() {
		const rc = el.getBoundingClientRect()
		size.panelWidth = rc.width
		size.fullWidth = size.panelWidth * numPanels
		curPosX = -curPanel * size.panelWidth
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
		if (scrollables) {
			scrollables.forEach(scroller => {
				scroller.removeEventListener('scroll', onScrollerScroll)
				scroller.removeEventListener('touchmove', onScrollerMove)
			})
		}
		el.removeEventListener('touchstart', onTouchStart)
		el.removeEventListener('touchmove', onTouchMove)
		el.removeEventListener('touchend', onTouchEnd)
		window.removeEventListener('resize', onResize)
		callbacks.dragstart = undefined
		callbacks.drag = undefined
		callbacks.dragend = undefined
		callbacks.change = undefined
		el = null as any
		scrollables = undefined
	}

	return {
		/** Add an event listener */
		on,
		/** Remove all event handlers, cleanup streams etc. */
		destroy,
		/** Returns current panel index */
		getPanel,
		/** Sets current panel index, animates to position */
		setPanel,
		/** Current sizes */
		size
	}
}
