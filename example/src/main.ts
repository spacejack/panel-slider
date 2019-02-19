import {clamp} from '../../src/math'
import PanelSlider from '../../src/index'
import * as ui from './ui'
import * as content from './content'

let slider: PanelSlider

const NUM_PANELS = 101
const MIN_PANEL_WIDTH = 360
const SLIDE_DURATION = 400

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
		maxSwipePanels: visiblePanels === 1 ? 1 : 3 * visiblePanels,
		slideDuration: SLIDE_DURATION,
		panelClassName: 'panel',
		dragThreshold: 2,
		// Callback that gets invoked when the PanelSlider needs
		// to render this panel.
		renderContent: (e) => {
			if (e.panelId === 0) {
				ui.renderIntro(e.dom)
				return PanelSlider.RENDERED
			}
			if (e.panelId === NUM_PANELS - 1) {
				ui.renderOutro(e.dom)
				return PanelSlider.RENDERED
			}
			// Try to get 'ready' content for this panel
			let c = content.peek(e.panelId)
			// If it's ready to use, we got an array of strings
			if (Array.isArray(c)) {
				// Content is available now - render it:
				ui.renderPanelContent(e.dom, e.panelId, c)
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
				ui.preRenderPanelContent(e.dom, e.panelId, 'loading...')
				return PanelSlider.FETCHING
			} else {
				// Content not available but this is a 'fast' render so
				// don't bother fetching anything.
				// We could render some 'loading' or low-res content here...
				ui.preRenderPanelContent(e.dom, e.panelId, '...')
				return PanelSlider.PRERENDERED
			}
		},
		on: {
			panelchange: e => {
				// Update panel ID displayed
				ui.elements.panelId.textContent = String(e.panelId)
			},
			animate: e => {
				// Update panel position displayed
				ui.elements.panelPos.textContent = e.panelFraction.toFixed(2)
			}
		}
	})
}

/** Compute how many panel widths fit in the container */
function calcVisiblePanels() {
	containerWidth = ui.elements.root.getBoundingClientRect().width
	return Math.max(Math.floor(containerWidth / MIN_PANEL_WIDTH), 1)
}

/** Handle nav page button click */
function onNavChange (e: ui.NavEvent) {
	const panelId0 = slider.getPanel()
	let panelId = panelId0
	if (e.type === 'goto') {
		panelId = e.id * 10
	} else if (e.type === 'skip') {
		const skip = Math.abs(e.id) <= 1
			? e.id
			: Math.sign(e.id) * numVisiblePanels
		panelId += skip
	}
	panelId = clamp(panelId, 0, NUM_PANELS - numVisiblePanels)
	const duration = SLIDE_DURATION * Math.pow(
		Math.max(Math.abs(panelId - panelId0), 1),
		0.25
	)
	// User clicked a nav button for this panel ID.
	// Fetch content immediately if it's not already available...
	content.get(panelId)
	// Send the PanelSlider there
	slider.setPanel(panelId, duration).then(pid => {
		ui.elements.panelId.textContent = String(pid)
	})
}

/** Build the nav buttons and respond to nav events */
function initNav() {
	const navItems: string[] = []
	for (let i = 0; i < NUM_PANELS; i += 10) {
		navItems.push(String(i))
		//navItems.push(i === 0 ? '⌂' : String(i))
	}
	ui.buildNav(navItems, onNavChange)
}

let containerWidth = ui.elements.root.getBoundingClientRect().width
let numVisiblePanels = calcVisiblePanels()

initNav()

window.addEventListener('load', () => {
	numVisiblePanels = calcVisiblePanels()
	initPanelSlider(numVisiblePanels)
	window.addEventListener('resize', e => {
		const n = calcVisiblePanels()
		if (n !== numVisiblePanels) {
			numVisiblePanels = n
			initPanelSlider(numVisiblePanels)
		}
	})
})
