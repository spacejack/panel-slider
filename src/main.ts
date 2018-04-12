import PanelSlider from './panel-slider'

const slider = PanelSlider({
	element: document.querySelector('.panel-set') as HTMLElement,
	numPanels: 3
})

// Display live results from callbacks

function $e (id: string) {
	return document.getElementById(id) as HTMLElement
}

const elId = $e('panelId')
const elPos = $e('panelPos')

slider.on('panelchange', panelId => {
	elId.textContent = String(panelId)
})

slider.on('animate', panelPos => {
	elPos.textContent = panelPos.toFixed(2)
})
