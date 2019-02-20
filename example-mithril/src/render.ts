import m from 'mithril'
import stream from 'mithril/stream'

export type ContentSize = '1' | '2' | '3'

export const contentSize = stream('3')

// Panel content rendering

const picsumOffset = Math.floor(Math.random() * 1000)

/** Render panel content. */
export function renderPanelContent (dom: HTMLElement, pid: number, texts: string[]) {
	const sz = contentSize()
	m.render(dom, m('div',
		m('h2', `${pid}. ${texts[1].substr(0, 10 + pid % 10).trim()}`),
		sz >= '2' && m('p',
			m('img', {
				style: 'width: 300px; height: 200px',
				src: `https://picsum.photos/300/200?image=${picsumOffset + pid}`
			})
		),
		sz === '3'
			? texts.map(text => m('p', text))
			: texts[0].substr(0, 2 * (10 + pid % 10)).trim()
	))
}

/** Pre-render (fast) */
export function preRenderPanelContent (dom: HTMLElement, pid: number, text: string) {
	const sz = contentSize()
	m.render(dom, m('div',
		m('h2', `${pid}. ...`),
		sz >= '2' && m('p',
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
		m('.small',
			m('.center.lg-lt', '➔'),
			m('p', 'Swipe left or right to navigate. Click the ⚙ button to adjust settings.'),
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
