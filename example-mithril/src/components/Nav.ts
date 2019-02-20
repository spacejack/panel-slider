import m from 'mithril'

export class NavEvent {
	type: string
	id: number
	constructor (type: 'goto' | 'skip' | 'config', i: number) {
		this.type = type
		this.id = i
	}
}

export interface Attrs {
	items: string[],
	onNav(e: NavEvent): void
}

const Nav: m.Component<Attrs> = {
	view: ({attrs}) => m('nav',
		// Skip buttons
		m('.group.mq-md',
			m('button.btn-pg.mq-lp',
				{
					type: 'button',
					onclick: () => {
						attrs.onNav({type: 'skip', id: -2})
					}
				},
				'⏪'
			),
			m('button.btn-pg',
				{
					type: 'button',
					onclick: () => {
						attrs.onNav({type: 'skip', id: -1})
					}
				},
				'◀️'
			),
			m('button.btn-pg',
				{
					type: 'button',
					onclick: () => {
						attrs.onNav({type: 'skip', id: 1})
					}
				},
				'▶️'
			),
			m('button.btn-pg.mq-lp',
				{
					type: 'button',
					onclick: () => {
						attrs.onNav({type: 'skip', id: 2})
					}
				},
				'⏩'
			)
		),
		// Page numbered buttons
		m('.group',
			attrs.items.map((item, i) => m('button.btn-pg',
				{
					type: 'button',
					onclick: () => {
						attrs.onNav({type: 'goto', id: i})
					}
				},
				item
			))
		),

		m('.group',
			m('button.btn-pg',
				{
					type: 'button',
					onclick: () => {
						attrs.onNav({type: 'config', id: 0})
					}
				},
				'⚙' //'☰'
			)
		)
	)
}

export default Nav
