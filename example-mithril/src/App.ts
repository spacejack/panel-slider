import m from 'mithril'
import stream from 'mithril/stream'
import {range} from '../../src/array'
import {clamp} from '../../src/math'
import PanelSlider from '../../src'
import * as content from './content'
import Nav, {NavEvent} from './Nav'
import Stats from './Stats'
import {
	renderIntro, renderOutro, renderPanelContent, preRenderPanelContent
} from './render'

const NUM_PANELS = 101
const MIN_PANEL_WIDTH = 360
const SLIDE_DURATION = 400
const NAV_ITEMS = range(0, NUM_PANELS, 10).map(i => String(i))

/**
 * Main application component.
 * Stateful component that manages a PanelSlider instance.
 */
export default function App(): m.Component {
	let slider: PanelSlider
	let numVisiblePanels = 1
	let dom: HTMLElement
	const panelId = stream(0)
	const panelPosition = stream(0)

	/**
	 * (Re)Create & configure a PanelSlider instance
	 */
	function initPanelSlider (visiblePanels: number) {
		let initialPanel = 0
		if (slider != null) {
			initialPanel = slider.getPanel()
			slider.destroy()
		}
		slider = PanelSlider({
			dom: document.querySelector('.panel-set') as HTMLElement,
			totalPanels: NUM_PANELS,  // # of total panels
			visiblePanels, // # of panels that fit on screen
			initialPanel,
			maxSwipePanels: visiblePanels === 1 ? 1 : 4 * visiblePanels,
			slideDuration: SLIDE_DURATION,
			panelClassName: 'panel',
			dragThreshold: 1,
			// Callback that gets invoked when the PanelSlider needs
			// to render this panel.
			renderContent: (e) => {
				if (e.panelId === 0) {
					renderIntro(e.dom)
					return PanelSlider.RENDERED
				}
				if (e.panelId === NUM_PANELS - 1) {
					renderOutro(e.dom)
					return PanelSlider.RENDERED
				}
				// Try to get 'ready' content for this panel
				let c = content.peek(e.panelId)
				// If it's ready to use, we got an array of strings
				if (Array.isArray(c)) {
					// Content is available now - render it:
					renderPanelContent(e.dom, e.panelId, c)
					// Indicate did render
					return PanelSlider.RENDERED
				} else if (e.type === 'render') {
					// Content not available yet - fetch
					c = c || Promise.resolve(content.get(e.panelId))
					c.then(() => {
						// Request PanelSlider to re-render this panel when the content promise
						// resolves. It's possible this panel is no longer bound to this ID by
						// then so the render request may be ignored.
						slider.render(e.panelId)
					})
					// Do a fast render while waiting
					preRenderPanelContent(e.dom, e.panelId, 'loading...')
					return PanelSlider.FETCHING
				} else {
					// Content not available but this is a 'fast' render so
					// don't bother fetching anything.
					// We could render some 'loading' or low-res content here...
					preRenderPanelContent(e.dom, e.panelId, '...')
					return PanelSlider.PRERENDERED
				}
			},
			on: {
				panelchange: e => {
					panelId(e.panelId)
				},
				animate: e => {
					panelPosition(e.panelFraction)
				}
			}
		})
	}

	/** Compute how many panel widths fit in the container */
	function calcVisiblePanels() {
		const w = dom.getBoundingClientRect().width
		return Math.max(Math.floor(w / MIN_PANEL_WIDTH), 1)
	}

	/** Handle nav page button click */
	function onNavChange (e: NavEvent) {
		const pid0 = slider.getPanel()
		let pid = pid0
		if (e.type === 'goto') {
			pid = e.id * 10
		} else if (e.type === 'skip') {
			const skip = Math.abs(e.id) <= 1
				? e.id
				: Math.sign(e.id) * numVisiblePanels
			pid += skip
		}
		pid = clamp(pid, 0, NUM_PANELS - numVisiblePanels)
		const duration = SLIDE_DURATION * Math.pow(
			Math.max(Math.abs(pid - pid0), 1),
			0.25
		)
		// User clicked a nav button for this panel ID.
		// Fetch content immediately if it's not already available...
		content.get(pid)
		// Send the PanelSlider there
		slider.setPanel(pid, duration).then(panelId)
	}

	function resize() {
		const n = calcVisiblePanels()
		if (n !== numVisiblePanels) {
			numVisiblePanels = n
			initPanelSlider(numVisiblePanels)
		}
	}

	return {
		oncreate: vnode => {
			dom = vnode.dom as HTMLElement
			// Defer PanelSlider init until document has loaded
			// to ensure that CSS styles have been applied.
			window.addEventListener('load', () => {
				numVisiblePanels = calcVisiblePanels()
				initPanelSlider(numVisiblePanels)
				window.addEventListener('resize', resize)
			})
		},
		onremove: () => {
			window.removeEventListener('resize', resize)
			if (slider) {
				slider.destroy()
			}
		},
		view: () => m('.container',
			m('.panel-set'),
			m(Stats, {
				panelId: panelId,
				position: panelPosition
			}),
			m(Nav, {
				items: NAV_ITEMS,
				onNav: onNavChange
			})
		)
	}
}
