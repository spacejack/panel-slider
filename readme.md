# Panel Slider

© by Mike Linkovich | [www.spacejack.ca](http://www.spacejack.ca/)

### [Live demo](https://spacejack.github.io/panel-slider/)

## Example Usage:

```typescript
import PanelSlider from 'panel-slider'

const slider = PanelSlider({
	// The root element containing all panels
	element: document.querySelector('.my-panel-slider'),
	// Number of equal-sized panels
	numPanels: 3,
	// Starting panel
	initialPanel: 0
})
```

## All Options:

```typescript
interface PanelSliderOptions {
	/** The root element to use */
	element: HTMLElement
	/** Number of panels the root element is divided into */
	numPanels: number
	/** Starting panel */
	initialPanel?: number
	/** Duration of slide animation (default 500ms) */
	slideDuration?: number
	/** Horizontal drag distance threshold (default 12px) */
	dragThreshold?: number
	/** Required minimum horizontal:vertical ratio (default 1.5) */
	dragRatio?: number
}
```

## Returned Interface:

```typescript
interface PanelSlider {
	/** Fires when drag starts */
	on (eventType: 'dragstart', cb: (d: Drag) => void): void
	/** Fires every move event while dragging */
	on (eventType: 'drag', cb: (d: Drag) => void): void
	/** Fires when drag ended */
	on (eventType: 'dragend', cb: (d: Drag) => void): void
	/** Fires every frame the panel moves */
	on (eventType: 'animate', cb: (panelFraction: number) => void): void
	/** Fires when current panel has changed */
	on (eventType: 'change', cb: (panelId: number) => void): void
	/** Sets the current panel - animates to position */
	setPanel (panelId: number, done?: (panelId: number) => void): void
	/** Gets the current panel */
	getPanel(): number
	/** Gets the current root element & panel sizes */
	getSizes(): {fullWidth: number, panelWidth: number}
	/** Destroy & cleanup resources */
	destroy(): void
}
```

## Drag object provided to drag callbacks

```typescript
export interface Drag {
	/** Horizontal amount dragged from start (in pixels) */
	x: number
	/** Current horizontal velocity */
	v: number
}
```
