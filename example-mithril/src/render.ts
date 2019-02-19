import m from 'mithril'

// Panel content rendering

const picsumOffset = Math.floor(Math.random() * 1000)

/** Render panel content. Returns DOM tree. */
export function renderPanelContent (dom: HTMLElement, pid: number, texts: string[]) {
	m.render(dom, m('div',
		m('h2', `${pid}. ${texts[1].substr(0, 10 + pid % 10).trim()}`),
		m('p',
			m('img', {
				style: 'width: 300px; height: 200px',
				src: `https://picsum.photos/300/200?image=${picsumOffset + pid}`
			})
		),
		texts.map(text =>
			m('p', text)
		)
	))
}

/** Pre-render (fast) */
export function preRenderPanelContent (dom: HTMLElement, pid: number, text: string) {
	m.render(dom, m('div',
		m('h2', `${pid}. ...`),
		m('p',
			m('div', {
				style: 'width: 300px; height: 200px; background-color: #DDD',
			})
		),
		m('p', {style: 'font-style: italic'}, text)
	))
}

export function renderIntro (dom: HTMLElement) {
	m.render(dom, m('.intro',
		m('h2.center', 'Panel-Slider'),
		m('.center.lg-lt', '➔'),
		m('p.center', 'Swipe left or right to navigate.'),
		m('p',
			'Panel content is loaded asynchronously. '
			+ 'On a desktop you can resize the window width to change the number of panels. '
			+ 'Mobile devices may show more panels in landscape orientation.'
		),
		m('p',
			'Docs and source: ',
			m('a',
				{href: 'http://github.com/spacejack/panel-slider'},
				'Github Repo'
			)
		)
	))
}

export function renderOutro (dom: HTMLElement) {
	m.render(dom, m('.intro.center',
		m('h2', 'Panel-Slider'),
		m('.lg-lt', {style: 'transform: rotate(180deg)'}, '➔'),
		m('p', 'Swipe left or right to navigate.'),
		m('p',
			'© 2019 by Mike Linkovich | ',
			m('a', {href: 'https://github.com/spacejack'}, 'Github')
		)
	))
}
