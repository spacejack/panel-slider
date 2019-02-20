import {range} from './array'
import {setPos3d} from './transform'
import Dragger from './Dragger'
import Panel from './Panel'
import * as gesture from './gesture'

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
	/**
	 * Sets the current panel - animates to position.
	 * @param panelId The panel index to go to
	 * @param duration Duration in ms. If omitted, the configured default is used.
	 */
	setPanel(panelId: number, duration?: number): Promise<number>
	/** Sets the current panel immediately, no animation */
	setPanelImmediate(panelId: number): void
	/** Gets the current root element & panel sizes */
	getSizes(): {fullWidth: number, panelWidth: number}
	/** Returns whether panels are currently being dragged or not */
	isDragging(): boolean
	/** Returns whether panels are currently animating or not */
	isAnimating(): boolean
	/**
	 * Triggers a render for the given panelId (or all panels if no index is provided.)
	 * The render will only occur if this panel index is in the render cache.
	 * Returns true if the render was performed otherwise false.
	 */
	render(panelId?: number): boolean
	/**
	 * PanelSlider listens for window resize events, however if your application resizes
	 * the container element you should call this method to ensure panel sizes and positions
	 * are maintained correctly
	 */
	resize(): void
	/** Destroy & cleanup resources */
	destroy(): void
}

/**
 * Creates a PanelSlider instance.
 */
function PanelSlider (cfg: PanelSlider.Options): PanelSlider {
	cfg = {...cfg}
	cfg.visiblePanels = cfg.visiblePanels || 1
	cfg.initialPanel = cfg.initialPanel || 0
	cfg.maxSwipePanels = cfg.maxSwipePanels || cfg.visiblePanels
	cfg.slideDuration = cfg.slideDuration || PanelSlider.DEFAULT_SLIDE_DURATION
	cfg.panelClassName = cfg.panelClassName || ''
	cfg.dragRatio = cfg.dragRatio || PanelSlider.DEFAULT_DRAG_RATIO
	cfg.dragThreshold = cfg.dragThreshold || PanelSlider.DEFAULT_DRAG_THRESHOLD
	cfg.on = cfg.on || {}
	cfg.terp = cfg.terp || PanelSlider.terp

	const emitters: PanelSlider.EventEmitters = {
		dragstart: [],
		drag: [],
		dragend: [],
		dragcancel: [],
		animate: [],
		animationstatechange: [],
		panelchange: [],
		panelswipe: []
	}
	for (const key of Object.keys(cfg.on) as (keyof PanelSlider.EventListeners)[]) {
		if (cfg.on[key] != null) {
			addListener(key, cfg.on[key]!)
		}
	}

	const panels = range(cfg.initialPanel, cfg.initialPanel + cfg.visiblePanels * 3).map(pid => Panel(
		pid, 100 / cfg.visiblePanels!, Panel.EMPTY, cfg.panelClassName
	))
	cfg.dom.innerHTML = ''
	for (const p of panels) {
		p.state = cfg.renderContent(
			new PanelSlider.RenderEvent('render', p.dom, p.index)
		)
		cfg.dom.appendChild(p.dom)
	}

	// Will be computed on resize
	let fullWidth = panels.length
	let visibleWidth = cfg.visiblePanels
	/** Width of a panel in pixels */
	let panelWidth = 1
	/** Current Panel index */
	let curPanel = cfg.initialPanel
	/** Current viewport position in pixels (left edge) */
	let curPosX = 0
	/** Indicates panel animation loop is running */
	let isAnimating = false
	/** Overscroll */
	const overscroll = 1

	/** Update our full width and panel width on resize */
	function resize() {
		const rc = cfg.dom.getBoundingClientRect()
		panelWidth = rc.width / cfg.visiblePanels!
		visibleWidth = panelWidth * cfg.visiblePanels!
		fullWidth = panelWidth * cfg.totalPanels
		curPosX = -curPanel * panelWidth
		render()
	}

	/** Applies averscroll dampening if dragged past edges */
	function applyOverscroll (x: number) {
		if (x > 0) {
			const xp = Math.min(1, x / (overscroll * panelWidth))
			return xp * (1 - Math.sqrt(xp / 2)) * overscroll * panelWidth
		}
		const xMax = fullWidth - panelWidth * cfg.visiblePanels!
		if (x < -xMax) {
			const dx = Math.abs(x - (-xMax))
			const xp = Math.min(1, dx / (overscroll * panelWidth))
			return -xMax - xp * (1 - Math.sqrt(xp / 2)) * overscroll * panelWidth
		}
		return x
	}

	function render (fast?: boolean) {
		// note that: curPosX = -curPanel * panelWidth
		const x = Math.abs(curPosX)
		/** Inclusive start/end panel indexes */
		let iStart = Math.floor(cfg.totalPanels * x / fullWidth)
		let iEnd = Math.min(
			Math.ceil(cfg.totalPanels * (x + panelWidth * cfg.visiblePanels!) / fullWidth),
			cfg.totalPanels - 1
		)
		// Render extra panels outward from viewport edges.
		// Start on the left side then alternate.
		for (let i = 0, n = panels.length - (iEnd - iStart + 1); n > 0; ++i) {
			if (i % 2 === 0) {
				if (iStart > 0) {
					iStart -= 1
					n -= 1
				}
			} else {
				if (iEnd < panels.length - 1) {
					iEnd += 1
					n -= 1
				}
			}
		}
		/** Cached panels that are still valid */
		const keepPanels: {[id: number]: Panel} = Object.create(null)
		/** ids of panels that were not cached */
		const ids: number[] = []
		// Render panels that are cached
		for (let i = iStart; i <= iEnd; ++i) {
			// Find a bound panel
			const panel = panels.find(p => p.index === i)
			if (panel) {
				if (panel.state < Panel.PRERENDERED || (!fast && panel.state < Panel.FETCHING)) {
					panel.state = cfg.renderContent(
						new PanelSlider.RenderEvent(
							fast ? 'preview' : 'render', panel.dom, panel.index
						)
					)
				}
				setPos3d(panel.dom, curPosX + i * panelWidth)
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
			// Panel has old content so must render
			panel.index = i
			panel.state = cfg.renderContent(
				new PanelSlider.RenderEvent(
					fast ? 'preview' : 'render', panel.dom, panel.index
				)
			)
			setPos3d(panel.dom, curPosX - i * panelWidth)
			keepPanels[i] = panel
		}
	}

	/** Application wants to re-render this panel (or all panels) content */
	function renderPanelContent (pid?: number) {
		if (pid != null) {
			const panel = panels.find(p => p.index === pid)
			if (!panel) return false
			panel.state = cfg.renderContent(
				new PanelSlider.RenderEvent('render', panel.dom, panel.index)
			)
			return true
		}
		for (const panel of panels) {
			panel.state = cfg.renderContent(
				new PanelSlider.RenderEvent('render', panel.dom, panel.index)
			)
		}
		return true
	}

	function emit (e: PanelSlider.Event) {
		for (const cb of emitters[e.type]) {
			cb(e as any)
		}
	}

	resize()

	const dragger = Dragger(cfg.dom, {
		dragThreshold: cfg.dragThreshold, dragRatio: cfg.dragRatio,
		devices: cfg.devices,
		on: {
			dragstart (e) {
				emit(new PanelSlider.DragEvent('drag', e.x, 0))
			},
			dragmove(e) {
				const ox = -curPanel * panelWidth
				//curPosX = Math.round(clamp(ox + e.x, -(fullWidth - panelWidth), 0))
				curPosX = applyOverscroll(ox + e.x)
				render()
				emit(new PanelSlider.AnimateEvent(
					'animate', -curPosX / panelWidth
				))
				emit(new PanelSlider.DragEvent('drag', e.x, e.xv))
			},
			dragcancel() {
				emit(new PanelSlider.DragEvent('dragcancel', curPosX, 0))
				swipeAnim(0).then(pid => {
					emit(new PanelSlider.ChangeEvent('panelchange', pid))
				})
			},
			dragend (e) {
				const ox = -curPanel * panelWidth
				//curPosX = Math.round(clamp(ox + e.x, -(fullWidth - panelWidth), 0))
				curPosX = applyOverscroll(Math.round(ox + e.x))
				render()
				swipeAnim(e.xv).then(pid => {
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

	/**
	 * @param xVelocity Speed of swipe in pixels/second
	 * @param done callback when swipe ends
	 */
	function swipeAnim (xVelocity: number) {
		const result = gesture.swipe({
			panelId: curPanel,
			x: curPosX, xv: xVelocity,
			maxSwipePanels: cfg.maxSwipePanels!,
			panelWidth,
			unitDuration: cfg.slideDuration!,
			totalPanels: cfg.totalPanels - (cfg.visiblePanels! - 1)
		})
		return animateTo(result.panelId, result.duration)
	}

	/** Animate panels to the specified panelId */
	function animateTo (destPanel: number, dur = cfg.slideDuration!): Promise<number> {
		if (isAnimating) {
			// TODO: Allow redirect
			console.warn("Cannot animateTo - already animating")
			return Promise.resolve(curPanel)
		}
		if (dragger.isDragging()) {
			console.warn("Cannot animateTo - currently dragging")
			return Promise.resolve(curPanel)
		}

		return new Promise(resolve => {
			isAnimating = true
			const startX = curPosX
			const destX = -destPanel * panelWidth

			function finish() {
				curPanel = destPanel
				isAnimating = false
				emit(new PanelSlider.AnimationEvent(
					'animationstatechange', false
				))
				resolve(curPanel)
			}

			function loop() {
				if (!isAnimating) {
					// Animation has been cancelled, assume
					// something else has changed curPanel.
					// (eg. setPanelImmediate)
					//emit(new PanelSlider.AnimationEvent('animationstatechange', false))
					//resolve(curPanel)
					return
				}
				const t = Date.now()
				const destX = -destPanel * panelWidth
				const totalT = t - startT
				const animT = Math.min(totalT, dur)
				curPosX = cfg.terp!(startX, destX, animT / dur)
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
		})
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

	/**
	 * Animates to position and updates panel index.
	 * The animation could be redirected or aborted,
	 * so the resulting index may not be what was
	 * requested. Or the promise may not resolve.
	 */
	function setPanel (panelId: number, duration = cfg.slideDuration): Promise<number> {
		return panelId === curPanel
			? Promise.resolve(panelId)
			: animateTo(panelId, duration)
	}

	/** Sets the current panel index immediately, no animation */
	function setPanelImmediate (panelId: number) {
		if (typeof panelId !== 'number' || !Number.isSafeInteger(panelId)
			|| panelId < 0 || panelId >= cfg.totalPanels
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
		if (cfg.dom != null) {
			cfg.dom.innerHTML = ''
			cfg.dom = undefined as any
		}
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
		render: renderPanelContent,
		resize,
		destroy,
	}
}

/**
 * PanelSlider static methods and properties.
 */
namespace PanelSlider {
	export const DEFAULT_SLIDE_DURATION = 500
	export const DEFAULT_DRAG_THRESHOLD = 12
	export const DEFAULT_DRAG_RATIO = 1.5

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

	/** Received by the application's `renderContent` callback */
	export class RenderEvent {
		type: 'render' | 'preview'
		dom: HTMLElement
		panelId: number
		constructor (type: 'render' | 'preview', dom: HTMLElement, panelId: number) {
			this.type = type
			this.dom = dom
			this.panelId = panelId
		}
	}

	/** Return value from application `renderContent` callback */
	export type RenderResult = 0 | 1 | 2 | 3 | -1
	/** Indicates the panel is empty after renderContent */
	export const EMPTY      : RenderResult = 0
	/** Indicates the panel is 'pre-rendered' after renderContent */
	export const PRERENDERED: RenderResult = 1
	/** Indicates the panel is 'pre-rendered' and awaiting content after renderContent */
	export const FETCHING   : RenderResult = 2
	/** Indicates the panel is fully rendered */
	export const RENDERED   : RenderResult = 3
	/** Indicates the panel content is out of date and needs to re-render */
	export const DIRTY      : RenderResult = -1

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
		panelswipe?(e: ChangeEvent): void
	}

	export interface EventEmitters {
		dragstart: ((e: DragEvent) => void)[]
		drag: ((e: DragEvent) => void)[]
		dragend: ((e: DragEvent) => void)[]
		dragcancel: ((e: DragEvent) => void)[]
		animate: ((e: AnimateEvent) => void)[]
		animationstatechange: ((e: AnimationEvent) => void)[]
		panelchange: ((e: ChangeEvent) => void)[]
		panelswipe: ((e: ChangeEvent) => void)[]
	}

	/** Event types */
	export type EventType = keyof EventEmitters

	/** PanelSlider creation options */
	export interface Options {
		/**
		 * The root DOM element to use. It should be empty and
		 * panel child elements will be added to it.
		 */
		dom: HTMLElement
		/** Total number of panels with content */
		totalPanels: number
		/** Total number of visible panels that fit across the width of panel-set container */
		visiblePanels?: number
		/** Starting panel */
		initialPanel?: number
		/** Maximum panels travelled from swipe (default visiblePanels) */
		maxSwipePanels?: number
		/** Duration of slide animation on release (default 500ms) */
		slideDuration?: number
		/** Horizontal distance threshold to initiate drag (default 12px) */
		dragThreshold?: number
		/** Minimum required horizontal:vertical ratio to initiate drag (default 1.5) */
		dragRatio?: number
		/** Input devices to enable (default ['mouse', 'touch']) */
		devices?: ('mouse' | 'touch')[]
		/** CSS className to use for the panel elements */
		panelClassName?: string
		/** Initial event listeners */
		on?: EventListeners
		/** Application function to render a panel */
		renderContent(event: RenderEvent): PanelSlider.RenderResult
		/**
		 * Optional custom animation interpolation function
		 * @param x0 Start coordinate
		 * @param x1 End coordinate
		 * @param t Time (0..1)
		 * @returns Interpolated value between x0 (t=0) and x1 (t=1)
		 */
		terp?(x0: number, x1: number, t: number): number
	}
}

export default PanelSlider
