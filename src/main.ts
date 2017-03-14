import createSlider from './panel-slider'

const slider = createSlider({
	el: document.querySelector('.panel-set') as HTMLElement,
	numPanels: 3,
	initialPanel: 0,
	scrollables: Array.from(document.querySelectorAll('.panel'))
})

slider.on('change', panelId => {
	console.log("Changed to panel " + panelId)
})
