import m from 'mithril'
import {Stream} from 'mithril/stream'

export interface Attrs {
	panelId: Stream<number>
	position: Stream<number>
}

const Stats: m.Component<Attrs> = {
	oncreate: ({attrs, dom}) => {
		// These values change rapidly, so write them directly to the DOM
		const elPos = dom.querySelector('#panel-position') as HTMLElement
		attrs.position.map(p => elPos.textContent = p.toFixed(2))
		const elId = dom.querySelector('#panel-id') as HTMLElement
		attrs.panelId.map(id => elId.textContent = String(id))
	},
	view: ({attrs}) => m('.stats',
		m('table',
			m('tr',
				m('td', 'Panel:'),
				m('td#panel-id', attrs.panelId)
			),
			m('tr',
				m('td', 'Position:'),
				m('td#panel-position', attrs.position().toFixed(2))
			)
		)
	)
}

export default Stats
