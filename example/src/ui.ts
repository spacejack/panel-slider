// Since this is a vanilla JS demo, this is our UI library
// that does the DOM rendering work for our app content.
// This is what you might replace with a library like Mithril, React, Vue, etc.

/** getElementById helper */
export function $e (id: string) {
	return document.getElementById(id) as HTMLElement
}

/** Static page elements expected to exist in HTML */
export const elements = {
	/** Element to display live panel ID */
	panelId: $e('panelId'),
	/** Element to display live panel position */
	panelPos: $e('panelPos'),
	root: document.querySelector('.panel-set') as HTMLElement
}

/** Create a page button element */
export function createButton (text: string, onclick?: (e: Event) => any) {
	const b = document.createElement('button')
	b.type = 'button'
	b.className = 'btn-pg'
	b.textContent = text
	if (onclick) {
		b.addEventListener('click', onclick)
	}
	return b
}

export class NavEvent {
	type: string
	id: number
	constructor (type: 'goto' | 'skip', i: number) {
		this.type = type
		this.id = i
	}
}

/** Build some quick nav links to jump across many panels */
export function buildNav (items: string[], onNav: (e: NavEvent) => void) {
	const nav = document.querySelector('nav')!
	// Page numbered buttons
	const lnav = document.createElement('div')
	lnav.className = 'group'
	items.forEach((item, i) => {
		lnav.appendChild(
			createButton(item, e => {
				onNav({type: 'goto', id: i})
			})
		)
	})
	// Skip buttons
	const rnav = document.createElement('div')
	rnav.className = 'group mq-md'
	let btn = createButton('⏪', () => {
		onNav({type: 'skip', id: -2})
	})
	btn.classList.add('mq-lp')
	rnav.appendChild(btn)
	rnav.appendChild(createButton('◀️', () => {
		onNav({type: 'skip', id: -1})
	}))
	rnav.appendChild(createButton('▶️', () => {
		onNav({type: 'skip', id: 1})
	}))
	btn = createButton('⏩', () => {
		onNav({type: 'skip', id: 2})
	})
	btn.classList.add('mq-lp')
	rnav.appendChild(btn)

	nav.innerHTML = ''
	nav.appendChild(rnav)
	nav.appendChild(lnav)
}

const picsumOffset = Math.floor(Math.random() * 1000)

/** Render panel content. Returns DOM tree. */
export function renderPanelContent (dom: HTMLElement, pid: number, texts: string[]) {
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
	// Replace-write this into the supplied element.
	// (A virtual dom would provide useful diffing here.)
	dom.innerHTML = ''
	dom.appendChild(div)
	return div
}

/** Pre-render (fast) */
export function preRenderPanelContent (dom: HTMLElement, pid: number, text: string) {
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
	// Replace-write this into the supplied element
	// (A virtual dom would provide useful diffing here.)
	dom.innerHTML = ''
	dom.appendChild(div)
	return div
}

export function renderIntro (dom: HTMLElement) {
	const div = document.createElement('div')
	div.className = 'center'
	div.innerHTML = `<h2>Panel Slider Demo</h2>
<div class="lg-lt">◀️ ▶️</div>
<p>Swipe left or right to navigate.</p>
<p>Panel content is loaded asynchronously.</p>
<p><a href="http://github.com/spacejack/panel-slider">Github Repo</a></p>`
	dom.innerHTML = ''
	dom.appendChild(div)
	return div
}
