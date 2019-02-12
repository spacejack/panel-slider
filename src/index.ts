import {range} from './array'
import {clamp} from './math'
import {setPos3d} from './transform'
import Dragger from './Dragger'

// tslint:disable unified-signatures

/**
 * Allows a user to drag a set of panels horizontally across a viewport.
 */
interface PanelSlider {
	/** Add a listener that fires when drag starts */
	on(eventType: 'dragstart', cb: (e: PanelSlider.DragEvent) => void): void
	/** Remove dragstart listener */
	off(eventType: 'dragstart', cb: (e: PanelSlider.DragEvent) => void): void
	/** Add a listener that fires every move event while dragging */
	on(eventType: 'drag', cb: (e: PanelSlider.DragEvent) => void): void
	/** Remove drag listener */
	off(eventType: 'drag', cb: (e: PanelSlider.DragEvent) => void): void
	/** Add a listener that fires when drag ended */
	on(eventType: 'dragend', cb: (e: PanelSlider.DragEvent) => void): void
	/** Remove dragend listener */
	off(eventType: 'dragend', cb: (e: PanelSlider.DragEvent) => void): void
	/** Add a listener that fires when drag canceled */
	on(eventType: 'dragcancel', cb: (e: PanelSlider.DragEvent) => void): void
	/** Remove dragcancel listener */
	off(eventType: 'dragcancel', cb: (e: PanelSlider.DragEvent) => void): void
	/** Add a listener that fires every frame the panel moves */
	on(eventType: 'animate', cb: (e: PanelSlider.AnimateEvent) => void): void
	/** Remove animate listener */
	off(eventType: 'animate', cb: (e: PanelSlider.AnimateEvent) => void): void
	/** Add a listener that fires when animation starts or ends */
	on(eventType: 'animationstatechange', cb: (e: PanelSlider.AnimationEvent) => void): void
	/** Remove animationstatechange listener */
	off(eventType: 'animationstatechange', cb: (e: PanelSlider.AnimationEvent) => void): void
	/** Add a listener that fires when current panel has changed */
	on(eventType: 'panelchange', cb: (e: PanelSlider.ChangeEvent) => void): void
	/** Remove panelchange listener */
	off(eventType: 'panelchange', cb: (e: PanelSlider.ChangeEvent) => void): void
	/** Gets the current panel */
	getPanel(): number
	/** Sets the current panel - animates to position */
	setPanel(panelId: number, done?: (panelId: number) => void): void
	/** Sets the current panel immediately, no animation */
	setPanelImmediate(panelId: number): void
	/** Gets the current root element & panel sizes */
	getSizes(): {fullWidth: number, panelWidth: number}
	/** Returns whether panels are currently being dragged or not */
	isDragging(): boolean
	/** Returns whether panels are currently animating or not */
	isAnimating(): boolean
	/**
	 * Forces a renderContent for the given panel ID (or all if none.)
	 * The render will only occur if this panel Id is in the render cache.
	 * Returns true if the render is performed otherwise false.
	 */
	renderContent(panelId: number): boolean
	/** Destroy & cleanup resources */
	destroy(): void
}

function createPanelElement(className = '', style: {width?: string, transform?: string} = {}) {
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

interface Panel {
	/** This panel always references the same dom node */
	readonly dom: HTMLElement
	/** Current panel index that renders to this panel */
	index: number
	/** Current x position as a % value */
	xpct: number
	// TODO: pixel value?
}

function Panel (index: number, widthPct: number, className = ''): Panel {
	const xpct = index * widthPct
	return {
		dom: createPanelElement(className, {
			transform: `translate3d(${xpct}%,0,0)`
		}),
		index,
		xpct
	}
}

/**
 * Creates a PanelSlider instance.
 */
function PanelSlider ({
	dom,
	totalPanels, visiblePanels, initialPanel = 0,
	slideDuration = PanelSlider.DEFAULT_SLIDE_DURATION,
	dragThreshold, dragRatio, devices,
	on = {},
	renderContent,
	terp = PanelSlider.terp
}: PanelSlider.Options): PanelSlider {
	const emitters: PanelSlider.EventEmitters = {
		dragstart: [],
		drag: [],
		dragend: [],
		dragcancel: [],
		animate: [],
		animationstatechange: [],
		panelchange: []
	}
	for (const key of Object.keys(on) as (keyof PanelSlider.EventListeners)[]) {
		if (on[key] != null) {
			addListener(key, on[key]!)
		}
	}
	const panelWidthPct = 100 / visiblePanels * 3
	const panels = range(visiblePanels * 3).map(pid => Panel(
		pid, panelWidthPct, 'panel'
	))
	dom.innerHTML = ''
	for (const p of panels) {
		renderContent(p.dom, p.index)
		dom.appendChild(p.dom)
	}

	// Will be computed on resize
	let fullWidth = panels.length
	let visibleWidth = visiblePanels
	let panelWidth = 1
	let curPanel = initialPanel
	let curPosX = 0
	let isAnimating = false

	/** Update our full width and panel width on resize */
	function resize() {
		const rc = dom.getBoundingClientRect()
		panelWidth = rc.width
		visibleWidth = panelWidth * visiblePanels
		fullWidth = panelWidth * totalPanels
		curPosX = -curPanel * panelWidth
		render()
	}

	function render (fast?: boolean, redrawAll?: boolean) {
		// note that: curPosX = -curPanel * panelWidth
		const x = Math.abs(curPosX)
		/** Inclusive start/end panel indexes */
		const iStart = Math.floor(totalPanels * x / fullWidth)
		const iEnd = Math.min(
			Math.ceil(totalPanels * (x + panelWidth) / fullWidth),
			totalPanels - 1
		)
		if (!fast) {
			console.log(`rendering panels ${iStart}-${iEnd}`)
		}
		/** Cached panels that are still valid */
		const keepPanels: {[id: number]: Panel} = Object.create(null)
		/** ids of panels that were not cached */
		const ids: number[] = []
		// Render panels that are cached
		for (let i = iStart; i <= iEnd; ++i) {
			// Find a cached panel
			const panel = panels.find(p => p.index === i)
			if (panel) {
				// Already rendered, just set position
				if (redrawAll) {
					// Unless a redraw is forced
					renderContent(panel.dom, i, fast)
				}
				setPos3d(panel.dom, curPosX + i * panelWidth)
				//keepPanels.push(panel)
				keepPanels[i] = panel
			} else {
				ids.push(i)
			}
		}
		// Render panels that weren't cached
		for (const i of ids) {
			const panel = panels.find(p => !keepPanels[p.index])
			if (panel == null) {
				console.warn('Could not find an available panel for id:', i)
				continue
			}
			// Need to render this
			if (!fast) {
				console.log(`updating panel: ${i}`)
				panel.index = i
			}
			renderContent(panel.dom, i, fast)
			setPos3d(panel.dom, curPosX - i * panelWidth)
			keepPanels[i] = panel
		}
	}

	/** Application wants to re-render this panel (or all panels) content */
	function renderPanelContent (pid?: number) {
		if (pid != null) {
			const panel = panels.find(p => p.index === pid)
			if (!panel) return false
			renderContent(panel.dom, panel.index)
			return true
		}
		for (const panel of panels) {
			renderContent(panel.dom, panel.index)
		}
		return true
	}

	function emit (e: PanelSlider.Event) {
		for (const cb of emitters[e.type]) {
			cb(e as any)
		}
	}

	resize()

	const dragger = Dragger(dom, {
		dragThreshold, dragRatio,
		devices,
		on: {
			dragstart (e) {
				emit(new PanelSlider.DragEvent('drag', e.x, 0))
			},
			dragmove(e) {
				const ox = -curPanel * panelWidth
				curPosX = Math.round(clamp(ox + e.x, -(fullWidth - panelWidth), 0))
				render()
				emit(new PanelSlider.AnimateEvent(
					'animate', -curPosX / panelWidth
				))
				emit(new PanelSlider.DragEvent('drag', e.x, e.xv))
			},
			dragcancel() {
				emit(new PanelSlider.DragEvent('dragcancel', curPosX, 0))
				swipeAnim(0, pid => {
					emit(new PanelSlider.ChangeEvent('panelchange', pid))
				})
			},
			dragend (e) {
				const ox = -curPanel * panelWidth
				curPosX = Math.round(clamp(ox + e.x, -(fullWidth - panelWidth), 0))
				//setX(dom, curPosX)
				render()
				swipeAnim(e.xv, pid => {
					emit(new PanelSlider.ChangeEvent('panelchange', pid))
				})
				emit(new PanelSlider.AnimateEvent(
					'animate', -curPosX / panelWidth
				))
				emit(new PanelSlider.DragEvent('dragend', e.x, e.xv))
			},
			devicepress() {
				// Ensure we have up-to-date dimensions whenever a drag action
				// may start in case we missed a stealth window resize.
				resize()
			}
		}
	})

	function swipeAnim (xvel: number, done?: (panelId: number) => void) {
		const x = curPosX + xvel * 0.5
		let destination = clamp(Math.round(-x / panelWidth), 0, totalPanels - 1)
		const p0 = curPanel
		if (destination - p0 > 1) destination = p0 + 1
		else if (p0 - destination > 1) destination = p0 - 1
		const dur = clamp(
			slideDuration - (slideDuration * (Math.abs(xvel / 10.0) / panelWidth)),
			17, slideDuration
		)
		animateTo(destination, dur, done)
	}

	/** Animate panels to the specified panelId */
	function animateTo (
		destPanel: number, dur = slideDuration, done?: (panelId: number) => void
	) {
		if (isAnimating) {
			console.warn("Cannot animateTo - already animating")
			return
		}
		if (dragger.isDragging()) {
			console.warn("Cannot animateTo - currently dragging")
			return
		}

		isAnimating = true
		const startX = curPosX
		const destX = -destPanel * panelWidth

		function finish() {
			curPanel = destPanel
			isAnimating = false
			emit(new PanelSlider.AnimationEvent(
				'animationstatechange', false
			))
			done && done(curPanel)
		}

		function loop() {
			if (!isAnimating) {
				// Animation has been cancelled, assume
				// something else has changed curPanel.
				// (eg. setPanelImmediate)
				done && done(curPanel)
				emit(new PanelSlider.AnimationEvent(
					'animationstatechange', false
				))
				return
			}
			const t = Date.now()
			const destX = -destPanel * panelWidth
			const totalT = t - startT
			const animT = Math.min(totalT, dur)
			curPosX = terp(startX, destX, animT / dur)
			// Use a 'fast' render unless this is the last frame of the animation
			const isLastFrame = totalT >= dur
			render(!isLastFrame)
			emit(new PanelSlider.AnimateEvent(
				'animate', -curPosX / panelWidth
			))
			if (!isLastFrame) {
				requestAnimationFrame(loop)
			} else {
				finish()
			}
		}

		if (destX === startX) {
			requestAnimationFrame(finish)
			emit(new PanelSlider.AnimateEvent(
				'animate', -curPosX / panelWidth
			))
			return
		}

		const startT = Date.now()
		requestAnimationFrame(loop)
		emit(new PanelSlider.AnimateEvent(
			'animate', -curPosX / panelWidth
		))
	}

	///////////////////////////////////////////////////////
	// Public

	/** Add an event listener */
	function addListener (n: PanelSlider.EventType, fn: (param: any) => void) {
		const arr = emitters[n] as any[]
		if (arr.indexOf(fn) === -1) {
			arr.push(fn)
		}
	}

	/** Remove an event listener */
	function removeListener (n: PanelSlider.EventType, fn: (param: any) => void) {
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

	/** Sets the current panel index immediately, no animation */
	function setPanelImmediate (panelId: number) {
		if (typeof panelId !== 'number' || !Number.isSafeInteger(panelId)
			|| panelId < 0 || panelId >= totalPanels
		) {
			throw new Error('Invalid panel')
		}
		if (isAnimating) {
			isAnimating = false
		} else if (panelId === curPanel) {
			return
		}
		curPanel = panelId
		curPosX = -curPanel * panelWidth
		//setX(dom, curPosX)
		render()
	}

	/** Remove all event handlers, cleanup streams etc. */
	function destroy() {
		// Remove event listeners
		window.removeEventListener('resize', resize)
		dragger.destroy()
		Object.keys(emitters).forEach(k => {
			emitters[k as PanelSlider.EventType].length = 0
		})
		dom = undefined as any
	}

	window.addEventListener('resize', resize)

	return {
		on: addListener,
		off: removeListener,
		getPanel,
		setPanel,
		setPanelImmediate,
		getSizes: () => ({fullWidth, panelWidth}),
		isDragging: dragger.isDragging,
		isAnimating: () => isAnimating,
		renderContent: renderPanelContent,
		destroy,
	}
}

/**
 * PanelSlider static methods and properties.
 */
namespace PanelSlider {
	export const DEFAULT_SLIDE_DURATION = 500

	/**
	 * Default animation interpolation function
	 * @param x0 Start coordinate
	 * @param x1 End coordinate
	 * @param t Time (0..1)
	 */
	export function terp (x0: number, x1: number, t: number): number {
		const r = (Math.PI / 2.0) * t
		const s = Math.sin(r)
		const si = 1.0 - s
		return (x0 * si + x1 * s)
	}

	/** Lightweight PanelSlider Event type */
	export class Event {
		type: EventType
		constructor(type: EventType) {
			this.type = type
		}
	}

	/** Event emitted when current panel changes */
	export class ChangeEvent extends Event {
		panelId: number
		constructor(type: 'panelchange', panelId: number) {
			super(type)
			this.panelId = panelId
		}
	}

	/** Event emitted when current panel dragged */
	export class DragEvent extends Event {
		/** Horizontal amount dragged from start (in pixels) */
		x: number
		/** Current horizontal velocity */
		xv: number
		constructor(type: 'drag' | 'dragstart' | 'dragend' | 'dragcancel', x: number, xv: number) {
			super(type)
			this.x = x
			this.xv = xv
		}
	}

	/** Emitted on animation start/stop */
	export class AnimationEvent extends Event {
		animating: boolean
		constructor(type: 'animationstatechange', animating: boolean) {
			super(type)
			this.animating = animating
		}
	}

	/** Emitted every frame during an animation */
	export class AnimateEvent extends Event {
		panelFraction: number
		constructor(type: 'animate', panelFraction: number) {
			super(type)
			this.panelFraction = panelFraction
		}
	}

	/** Event Listener signature */
	export type EventListener = (e: Event) => void

	export interface EventListeners {
		dragstart?(e: DragEvent): void
		drag?(e: DragEvent): void
		dragend?(e: DragEvent): void
		dragcancel?(e: DragEvent): void
		animate?(e: AnimateEvent): void
		animationstatechange?(e: AnimationEvent): void
		panelchange?(e: ChangeEvent): void
	}

	export interface EventEmitters {
		dragstart: ((e: DragEvent) => void)[]
		drag: ((e: DragEvent) => void)[]
		dragend: ((e: DragEvent) => void)[]
		dragcancel: ((e: DragEvent) => void)[]
		animate: ((e: AnimateEvent) => void)[]
		animationstatechange: ((e: AnimationEvent) => void)[]
		panelchange: ((e: ChangeEvent) => void)[]
	}

	/** Event types */
	export type EventType = keyof EventEmitters

	/** PanelSlider creation options */
	export interface Options {
		/** The root element to use */
		dom: HTMLElement
		/** Total number of panels */
		totalPanels: number
		/** Total number of visible panels that fit across the width of panel-set container */
		visiblePanels: number
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
		/** Initial event listeners */
		on?: EventListeners
		/** Application function to render a panel */
		renderContent(dom: HTMLElement, panelIndex: number, fast?: boolean): void
		/**
		 * Optional custom animation interpolation function
		 * @param x0 Start coordinate
		 * @param x1 End coordinate
		 * @param t Time (0..1)
		 */
		terp?(x0: number, x1: number, t: number): number
	}
}

export default PanelSlider
