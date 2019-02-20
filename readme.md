# Panel-Slider

### [Live demo](https://spacejack.github.io/panel-slider/next/)

Panel-Slider is an "infinite" horizontally scrolling widget that smoothly transitions between equal-sized panels. It can use swipe gestures on touch devices and respond to specific manual navigation inputs.

Panel-Slider uses fast CSS transforms for animation and manages a pool of dom elements for rendering. DOM resource usage scales linearly with the number of panels visible on screen at one time. The total number of panels can be arbitrarily large.

This is a fairly low-level tool to provide interaction and animation. Efficient resource fetching, caching, and content rendering are left up to your application.

## Install:

	npm install panel-slider

A complete, working demo app is included in the `example` directory.

## Usage:

### Simple Example:

```typescript
import PanelSlider from 'panel-slider'

const slider = PanelSlider({
	dom: document.querySelector('.panel-slider'),
	totalPanels: 25,  // # of total panels
	visiblePanels: 1, // # of panels that fit on screen
	maxSwipePanels: 1, // Max # of panels to travel from a swipe gesture
	slideDuration: 300, // Normal duration to animate 1 panel across
	panelClassName: 'panel', // Optional class to use for panel elements
	// Render callback receives a RenderEvent object:
	renderContent: e => {
		e.dom.textContent = 'Panel ' + e.panelId
		return PanelSlider.RENDERED
	},
	on: {
		panelchange: e => {
			console.log('Panel changed to: ' + e.panelId)
		}
	}
})
```

Your application must provide an empty DOM element for the PanelSlider to build itself in. You can control the size and positioning of that container element with CSS. PanelSlider adapts to the size of the container and watches for window resizes to keep panels updated to fit properly.

This container element must also have a css `position` style (`relative`, `absolute`, etc.) so that panels can be positioned absolutely within it.

A number of panel elements will be added to the container which will be used to display and cache rendered panels. You can specify a CSS class with the `panelClassName` option, but note that the following inline styles will be applied to panel elements regardless:

```css
{
	position: absolute;
	top: 0;
	left: 0;
	height: 100%;
	/* computed when rendered */
	width: W;
	transform: translate3d(X,0,0);
}
```
You must also provide a `renderContent` callback that accepts an object with a DOM element and panel index. For example:

```typescript
interface RenderEvent {
	type: 'render' | 'preview'
	dom: HTMLElement
	panelId: number
}

function renderContent (e: RenderEvent) {
	e.dom.appendChild(myRender(e.panelId))
	return PanelSlider.RENDERED
}
```
Where the `myRender` function knows how to build the content dom tree for that panel index. Alternately, with React:

```tsx
ReactDOM.render(<PanelContent id={e.panelId}/>, e.dom)
```

or Mithril:

```typescript
m.render(e.dom, m(PanelContent, {id: e.panelId}))
```
Note that the `RenderEvent` object received by your callback also has a `type` property that hints whether a full render ("render") or a fast one ("preview") is requested. This allows your app to decide whether or not to initiate network requests for content or to perform heavy layout work. You can return the value `PanelSlider.RENDERED` to indicate the panel is finished or `PanelSlider.PRERENDERED` meaning it is only partially rendered.

The application render cannot be asynchronous. If you need to perform an async operation before rendering, you can request another render for this panel index when the content arrives, using the `PanelSlider` instance `render` method. In this case you can return the value `PanelSlider.FETCHING`.

## All Options:

```typescript
interface Options {
	/**
	 * The root DOM element to use. It should be empty and
	 * panel child elements will be added to it.
	 */
	dom: HTMLElement
	/** Total number of panels with content */
	totalPanels: number
	/** Total number of visible panels that fit across the width of panel-set container */
	visiblePanels?: number
	/** Starting panel */
	initialPanel?: number
	/** Maximum panels travelled from swipe (default visiblePanels) */
	maxSwipePanels?: number
	/** Duration of slide animation on release (default 500ms) */
	slideDuration?: number
	/** Horizontal distance threshold to initiate drag (default 12px) */
	dragThreshold?: number
	/** Minimum required horizontal:vertical ratio to initiate drag (default 1.5) */
	dragRatio?: number
	/** Input devices to enable (default ['mouse', 'touch']) */
	devices?: ('mouse' | 'touch')[]
	/** CSS className to use for the panel elements */
	panelClassName?: string
	/** Initial event listeners */
	on?: EventListeners
	/** Application function to render a panel */
	renderContent(event: RenderEvent): PanelSlider.RenderResult
	/**
	 * Optional custom animation interpolation function
	 * @param x0 Start coordinate
	 * @param x1 End coordinate
	 * @param t Time (0..1)
	 * @returns Interpolated value between x0 (t=0) and x1 (t=1)
	 */
	terp?(x0: number, x1: number, t: number): number
}
```

## Returned Interface:

```typescript
interface PanelSlider {
	/** Add a listener that fires when drag starts */
	on(eventType: 'dragstart', cb: (e: PanelSlider.DragEvent) => void): void
	/** Remove dragstart listener */
	off(eventType: 'dragstart', cb: (e: PanelSlider.DragEvent) => void): void
	/** Add a listener that fires every move event while dragging */
	on(eventType: 'drag', cb: (e: PanelSlider.DragEvent) => void): void
	/** Remove drag listener */
	off(eventType: 'drag', cb: (e: PanelSlider.DragEvent) => void): void
	/** Add a listener that fires when drag ended */
	on(eventType: 'dragend', cb: (e: PanelSlider.DragEvent) => void): void
	/** Remove dragend listener */
	off(eventType: 'dragend', cb: (e: PanelSlider.DragEvent) => void): void
	/** Add a listener that fires when drag canceled */
	on(eventType: 'dragcancel', cb: (e: PanelSlider.DragEvent) => void): void
	/** Remove dragcancel listener */
	off(eventType: 'dragcancel', cb: (e: PanelSlider.DragEvent) => void): void
	/** Add a listener that fires every frame the panel moves */
	on(eventType: 'animate', cb: (e: PanelSlider.AnimateEvent) => void): void
	/** Remove animate listener */
	off(eventType: 'animate', cb: (e: PanelSlider.AnimateEvent) => void): void
	/** Add a listener that fires when animation starts or ends */
	on(eventType: 'animationstatechange', cb: (e: PanelSlider.AnimationEvent) => void): void
	/** Remove animationstatechange listener */
	off(eventType: 'animationstatechange', cb: (e: PanelSlider.AnimationEvent) => void): void
	/** Add a listener that fires when current panel has changed */
	on(eventType: 'panelchange', cb: (e: PanelSlider.ChangeEvent) => void): void
	/** Remove panelchange listener */
	off(eventType: 'panelchange', cb: (e: PanelSlider.ChangeEvent) => void): void
	/** Gets the current panel */
	getPanel(): number
	/**
	 * Sets the current panel - animates to position.
	 * @param panelId The panel index to go to
	 * @param duration Duration in ms. If omitted, the configured default is used.
	 */
	setPanel(panelId: number, duration?: number): Promise<number>
	/** Sets the current panel immediately, no animation */
	setPanelImmediate(panelId: number): void
	/** Gets the current root element & panel sizes */
	getSizes(): {fullWidth: number, panelWidth: number}
	/** Returns whether panels are currently being dragged or not */
	isDragging(): boolean
	/** Returns whether panels are currently animating or not */
	isAnimating(): boolean
	/**
	 * Triggers a render for the given panelId (or all panels if no index is provided.)
	 * The render will only occur if this panel index is in the render cache.
	 * Returns true if the render was performed otherwise false.
	 */
	render(panelId?: number): boolean
	/**
	 * PanelSlider listens for window resize events, however if your application resizes
	 * the container element you should call this method to ensure panel sizes and positions
	 * are maintained correctly
	 */
	resize(): void
	/** Destroy & cleanup resources */
	destroy(): void
}
```

See the file `index.d.ts` for a full list of types.

---

© 2019 by Mike Linkovich

See license.txt
