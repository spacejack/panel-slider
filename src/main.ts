import PanelSlider from './panel-slider'

const slider = PanelSlider({
	el: document.querySelector('.panel-set') as HTMLElement,
	numPanels: 3,
	initialPanel: 0
})

slider.on('change', panelId => {
	console.log("Changed to panel " + panelId)
})
