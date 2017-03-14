# Panel Slider

© by Mike Linkovich | [www.spacejack.ca](http://www.spacejack.ca/)

### [Live demo](http://www.spacejack.ca/panel-slider/)

## Usage:

```typescript
import createSlider from './panel-slider'

const slider = createSlider({
	// The root element containing all panels
	el: panelsElement,
	// Number of equal-sized panels
	numPanels: 3,
	// Starting panel
	initialPanel: 0,
	// Elements that should only scroll when not swiping
	scrollables: [el1, el2, el3]
})

// Callbacks triggered on events
slider.on('change' (panelIndex) => {
	// ...
})

// Animate to panel index (starting from 0)
slider.setPanel(1) // slides to 2nd panel

// Cleanup, remove listeners
slider.destroy()

```
