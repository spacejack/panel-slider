import {clamp} from '../../src/math'
import Panel from '../../src/Panel'
import PanelSlider from '../../src/index'
import * as ui from './ui'
import * as content from './content'

let slider: PanelSlider

const NUM_PANELS = 101
const MIN_PANEL_WIDTH = 360

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
		slideDuration: 400,
		panelClassName: 'panel',
		// Callback that gets invoked when the PanelSlider needs
		// to render this panel.
		// panel - the Panel we're rendering
		// fast  - a boolean indicating if this is a 'fast' (animating)
		//         frame, in which case we should skip async/heavy tasks.
		renderContent: (panel, fast) => {
			// Try to get 'ready' content for this panel
			let c = content.peek(panel.index)
			// If it's ready to use, we got an array of strings
			if (Array.isArray(c)) {
				// Content is available now - render it:
				ui.renderPanelContent(panel.dom, panel.index, c)
				// Indicate did render
				return Panel.RENDERED
			} else if (!fast) {
				// Content not available yet - fetch
				c = c || Promise.resolve(content.get(panel.index))
				c.then(() => {
					// Request PanelSlider to re-render this panel when the content promise
					// resolves. It's possible this panel is no longer bound to this ID by
					// then so the render request may be ignored.
					slider.renderContent(panel.index)
				})
				// Do a fast render while waiting
				ui.preRenderPanelContent(panel.dom, panel.index, 'loading...')
				return Panel.FETCHING
			} else {
				// Content not available but this is a 'fast' render so
				// don't bother fetching anything.
				// We could render some 'loading' or low-res content here...
				ui.preRenderPanelContent(panel.dom, panel.index, '...')
				return Panel.PRERENDERED
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
	let panelId = slider.getPanel()
	if (e.type === 'goto') {
		panelId = e.id * 10
	} else if (e.type === 'skip') {
		const skip = Math.abs(e.id) <= 1
			? e.id
			: Math.sign(e.id) * numVisiblePanels
		panelId = clamp(panelId + skip, 0, NUM_PANELS - 1)
	}
	// User clicked a nav button for this panel ID.
	// Fetch content immediately if it's not already available...
	content.get(panelId)
	// Send the PanelSlider there
	slider.setPanel(panelId).then(pid => {
		ui.elements.panelId.textContent = String(pid)
	})
}

/** Build the nav buttons and respond to nav events */
function initNav() {
	const navItems: string[] = []
	for (let i = 0; i < NUM_PANELS; i += 10) {
		navItems.push(String(i))
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
