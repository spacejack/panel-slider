import createSpeedo from './speedo'

const NONE  = 0
const MOUSE = 1
const TOUCH = 2

const DEVICE_DELAY = 300

const DEFAULT_DRAG_THRESHOLD = 12
const DEFAULT_DRAG_RATIO     = 1.5

export interface DraggerOptions {
	/** Specify drag threshold distance */
	dragThreshold?: number
	/** Specifiy minimum drag ratio */
	dragRatio?: number
	/** Devices to accept input from (default ['mouse', 'touch']) */
	devices?: ('mouse' | 'touch')[]
	/** Fires when dragThreshold exceeded and element is in 'dragging' state */
	ondragstart?(dx: number): void
	/** Fires for every move made while dragged */
	ondragmove?(dx: number, dvx: number): void
	/** Fires when drag ends */
	ondragend?(dx: number, dvx: number): void
	/** Fires if drag was started then cancelled */
	ondragcancel?(): void
	/** Fires when input device pressed */
	ondevicepress?(e: MouseEvent | TouchEvent): void
	/** Fires when input device released */
	ondevicerelease?(e: MouseEvent | TouchEvent): void
	/** Maximum left drag amount */
	maxLeft?(): number
	/** Maximum left drag amount */
	maxRight?(): number
}

/**
 * Given a dom element, sends back horizontal 'drag' events.
 */
function Dragger (
	el: HTMLElement,
	{
		ondragstart, ondragmove, ondragend, ondragcancel,
		ondevicepress, ondevicerelease,
		dragThreshold = DEFAULT_DRAG_THRESHOLD,
		dragRatio = DEFAULT_DRAG_RATIO,
		devices,
		maxLeft, maxRight
	}: DraggerOptions = {}
) {
	applyIOSHack()
	const speedo = createSpeedo()
	let device: 0 | 1 | 2 = NONE
	/** Flag to prevent dragging while some child element is scrolling */
	let isScrolling = false
	/** Touch/Mouse is down */
	let pressed = false
	/** Indicates drag threshold crossed and we're in "dragging" mode */
	let isDragging = false
	const dragStart = {x: 0, y: 0}

	function onMouseDown (e: MouseEvent) {
		if (device === TOUCH) return
		cancelPress()
		if (e.button !== 0) return
		device = MOUSE
		window.addEventListener('mousemove', onMouseMove)
		window.addEventListener('mouseup', onMouseUp)
		onPress(e.clientX, e.clientY, e)
	}
	function onMouseMove (e: MouseEvent) {
		onMove(e.clientX, e.clientY, e)
	}
	function onMouseUp (e: MouseEvent) {
		window.removeEventListener('mousemove', onMouseMove)
		window.removeEventListener('mouseup', onMouseUp)
		onRelease(e.clientX, e.clientY, e)
	}

	function onTouchStart (e: TouchEvent) {
		if (device === MOUSE) return
		cancelPress()
		device = TOUCH
		el.addEventListener('touchmove', onTouchMove)
		el.addEventListener('touchend', onTouchEnd)
		const t = e.changedTouches[0]
		onPress(t.clientX, t.clientY, e)
	}
	function onTouchMove (e: TouchEvent) {
		const t = e.changedTouches[0]
		onMove(t.clientX, t.clientY, e)
	}
	function onTouchEnd (e: TouchEvent) {
		el.removeEventListener('touchmove', onTouchMove)
		el.removeEventListener('touchend', onTouchEnd)
		const t = e.changedTouches[0]
		onRelease(t.clientX, t.clientY, e)
	}

	function onPress (x: number, y: number, e: MouseEvent | TouchEvent) {
		isScrolling = false
		pressed = true
		dragStart.x = x
		dragStart.y = y
		speedo.start(0, Date.now() / 1000)
		document.addEventListener('scroll', onScroll, true)
		ondevicepress && ondevicepress(e)
	}

	function onMove (x: number, y: number, e: MouseEvent | TouchEvent) {
		if (!pressed) return
		let dx = x - dragStart.x
		if (maxLeft != null) {
			dx = Math.max(dx, maxLeft())
		}
		if (maxRight != null) {
			dx = Math.min(dx, maxRight())
		}
		const dy = y - dragStart.y
		speedo.addSample(dx, Date.now() / 1000)
		if (!isDragging) {
			const ratio = dy !== 0 ? Math.abs(dx / dy) : 1000000000.0
			if (Math.abs(dx) < dragThreshold || ratio < dragRatio) {
				// Still not dragging. Bail out.
				return
			}
			// Distance threshold crossed - init drag state
			isDragging = true
			ondragstart && ondragstart(dx)
		}
		e.preventDefault()
		ondragmove && ondragmove(dx, speedo.getVel())
	}

	function onRelease (x: number, y: number, e: MouseEvent | TouchEvent) {
		document.removeEventListener('scroll', onScroll, true)
		pressed = false
		if (!isDragging) {
			// Never crossed drag start threshold, bail out now.
			return
		}
		isDragging = false
		const dx = x - dragStart.x
		speedo.addSample(dx, Date.now() / 1000)
		setTimeout(() => {
			if (!pressed) device = NONE
		}, DEVICE_DELAY)
		ondevicerelease && ondevicerelease(e)
		ondragend && ondragend(dx, speedo.getVel())
	}

	function onScroll (e: UIEvent) {
		isScrolling = true
		cancelPress()
	}

	function cancelPress() {
		if (!pressed) return
		if (device === MOUSE) {
			window.removeEventListener('mousemove', onMouseMove)
			window.removeEventListener('mouseup', onMouseUp)
		} else if (device === TOUCH) {
			el.removeEventListener('touchmove', onTouchMove)
			el.removeEventListener('touchend', onTouchEnd)
		}
		document.removeEventListener('scroll', onScroll, true)
		pressed = false
		if (isDragging) {
			isDragging = false
			ondragcancel && ondragcancel()
		}
	}

	function destroy() {
		el.removeEventListener('mousedown', onMouseDown)
		window.removeEventListener('mouseup', onMouseUp)
		window.removeEventListener('mousemove', onMouseMove)
		el.removeEventListener('touchstart', onTouchStart)
		el.removeEventListener('touchend', onTouchEnd)
		el.removeEventListener('touchmove', onTouchMove)
		document.removeEventListener('scroll', onScroll, true)
	}

	if (!devices || devices.indexOf('mouse') >= 0) {
		el.addEventListener('mousedown', onMouseDown)
	}
	if (!devices || devices.indexOf('touch') >= 0) {
		el.addEventListener('touchstart', onTouchStart)
	}

	return {
		isDragging: () => isDragging,
		destroy
	}
}

type Dragger = ReturnType<typeof Dragger>

export default Dragger

// Workaround for webkit bug where event.preventDefault
// within touchmove handler fails to prevent scrolling.
const isIOS = !!navigator.userAgent.match(/iPhone|iPad|iPod/i)
let iOSHackApplied = false
function applyIOSHack() {
	// Only apply this hack if iOS, haven't yet applied it,
	// and only if a component is actually created
	if (!isIOS || iOSHackApplied) return
	window.addEventListener('touchmove', function(){})
	iOSHackApplied = true
}
