import PanelSlider from '../../src/index'
import * as content from './content'

/** getElementById helper */
function $e (id: string) {
	return document.getElementById(id) as HTMLElement
}

/** Element to display live panel ID */
const elId = $e('panelId')
/** Element to display live panel position */
const elPos = $e('panelPos')

/** Render Panel Content */
function renderPanelContent (title: string, texts: string[]) {
	const div = document.createElement('div')
	const h2 = document.createElement('h2')
	h2.textContent = title
	div.appendChild(h2)
	for (const text of texts) {
		const p = document.createElement('p')
		p.textContent = text
		div.appendChild(p)
	}
	return div
}

// Create & configure a PanelSlider instance
const slider = PanelSlider({
	dom: document.querySelector('.panel-set') as HTMLElement,
	totalPanels: 20,  // # of total panels
	visiblePanels: 1, // # of panels that fit on screen
	renderContent: (dom, pid) => {
		// Fetch content for this panel
		const c = content.get(pid)
		if (Array.isArray(c)) {
			// Content is available now - render it:
			dom.innerHTML = ''
			dom.appendChild(renderPanelContent('Panel ' + (pid + 1), c))
		} else {
			// Content not available yet - try to get PanelSlider
			// to re-render this panel when the promise resolves.
			c.then(() => {slider.renderContent(pid)})
		}
	},
	on: {
		panelchange: e => {
			// Update panel ID displayed
			elId.textContent = String(e.panelId)
		},
		animate: e => {
			// Update panel position displayed
			elPos.textContent = e.panelFraction.toFixed(2)
		}
	}
})

// To cleanup:
// slider.destroy()
