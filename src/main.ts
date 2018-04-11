import PanelSlider from './panel-slider'

function $e (id: string) {
	return document.getElementById(id) as HTMLElement
}

const slider = PanelSlider({
	element: document.querySelector('.panel-set') as HTMLElement,
	numPanels: 3,
	initialPanel: 0
})

const elId = $e('panelId')
const elPos = $e('panelPos')

slider.on('change', panelId => {
	//console.log("Changed to panel " + panelId)
	elId.textContent = String(panelId)
})

slider.on('animate', panelPos => {
	elPos.textContent = panelPos.toFixed(2)
})
