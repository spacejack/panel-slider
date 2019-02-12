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

const NUM_PANELS = 100

function createPageButton (panelId: number) {
	const b = document.createElement('button')
	b.type = 'button'
	b.className = 'btn-pg'
	b.textContent = String(panelId)
	b.addEventListener('click', () => {
		slider.setPanel(panelId, pid => {
			elId.textContent = String(pid)
		})
	})
	return b
}

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

buildNav()

// Create & configure a PanelSlider instance
const slider = PanelSlider({
	dom: document.querySelector('.panel-set') as HTMLElement,
	totalPanels: NUM_PANELS,  // # of total panels
	visiblePanels: 1, // # of panels that fit on screen
	slideDuration: 275,
	renderContent: (dom, pid, fast) => {
		// Try to get 'ready' content for this panel
		let c = content.peek(pid)
		// If it's ready to use, we got an array of strings
		if (Array.isArray(c)) {
			// Content is available now - render it:
			dom.innerHTML = ''
			dom.appendChild(renderPanelContent(pid, c))
			//try to force dom layout?
			//let rc = dom.getBoundingClientRect()
		} else if (!fast) {
			// Content not available yet - fetch
			c = c || Promise.resolve(content.get(pid))
			// Request PanelSlider to re-render this panel when the content promise resolves.
			c.then(() => {slider.renderContent(pid)})
		} else {
			// Content not available but this is a 'fast' render so
			// don't bother fetching anything.
			// We could render some 'loading' or low-res content here...
			//dom.innerHTML = ''
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
