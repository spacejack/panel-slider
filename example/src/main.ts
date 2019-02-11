import PanelSlider from '../../src/index'
import content from './content'

/** getElementById helper */
function $e (id: string) {
	return document.getElementById(id) as HTMLElement
}

/** Element to display live panel ID */
const elId = $e('panelId')
/** Element to display live panel position */
const elPos = $e('panelPos')

const slider = PanelSlider({
	dom: document.querySelector('.panel-set') as HTMLElement,
	totalPanels: 3,
	visiblePanels: 1,
	renderContent: (dom, pid) => {
		dom.innerHTML = content[pid]
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
