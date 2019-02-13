import Panel from '../../src/Panel'
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

const NUM_PANELS = 101

/** Create a page button element */
function createPageButton (panelId: number) {
	const b = document.createElement('button')
	b.type = 'button'
	b.className = 'btn-pg'
	b.textContent = String(panelId)
	b.addEventListener('click', () => {
		// Start fetching the destination panel content
		content.get(panelId)
		// Send the PanelSlider there
		slider.setPanel(panelId).then(pid => {
			elId.textContent = String(pid)
		})
	})
	return b
}

/** Build some quick nav links to jump across many panels */
function buildNav() {
	const nav = document.querySelector('nav')!
	for (let i = 0; i < NUM_PANELS; i += 10) {
		nav.appendChild(createPageButton(i))
	}
}

const picsumOffset = Math.floor(Math.random() * 1000)

/** Render panel content. Returns DOM tree. */
function renderPanelContent (pid: number, texts: string[]) {
	const div = document.createElement('div')
	const h2 = document.createElement('h2')
	h2.textContent = 'Panel ' + pid
	div.appendChild(h2)
	const img = document.createElement('img')
	img.style.width = '300px'
	img.style.height = '200px'
	img.src = 'https://picsum.photos/300/200?image=' + (picsumOffset + pid)
	const p = document.createElement('p')
	p.appendChild(img)
	div.appendChild(p)
	for (const text of texts) {
		const p = document.createElement('p')
		p.textContent = text
		div.appendChild(p)
	}
	return div
}

function preRenderPanelContent (pid: number, text: string) {
	const div = document.createElement('div')
	const h2 = document.createElement('h2')
	h2.textContent = 'Panel ' + pid
	div.appendChild(h2)
	const img = document.createElement('div')
	img.style.width = '300px'
	img.style.height = '200px'
	img.style.display = 'inline-block'
	img.style.backgroundColor = '#DDD'
	let p = document.createElement('p')
	p.appendChild(img)
	div.appendChild(p)
	p = document.createElement('p')
	p.style.fontStyle = 'italic'
	p.textContent = text
	div.appendChild(p)
	return div
}

buildNav()

//
// Create & configure a PanelSlider instance
//
const slider = PanelSlider({
	dom: document.querySelector('.panel-set') as HTMLElement,
	totalPanels: NUM_PANELS,  // # of total panels
	visiblePanels: 1, // # of panels that fit on screen
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
			panel.dom.innerHTML = ''
			panel.dom.appendChild(renderPanelContent(panel.index, c))
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
			panel.dom.innerHTML = ''
			panel.dom.appendChild(preRenderPanelContent(panel.index, 'loading...'))
			return Panel.FETCHING
		} else {
			// Content not available but this is a 'fast' render so
			// don't bother fetching anything.
			// We could render some 'loading' or low-res content here...
			panel.dom.innerHTML = ''
			panel.dom.appendChild(preRenderPanelContent(panel.index, '...'))
			return Panel.PRERENDERED
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
