import m from 'mithril'

export type ContentSize = '1' | '2' | '3'

const SIZES: Record<ContentSize, string> = {'1': 'small', '2': 'medium', '3': 'large'}

export interface Config {
	maxSwipePanels?: number
	contentSize: ContentSize
	slideDuration: number
}

export interface Attrs {
	config: Config
	onChange(c: Config): void
	onClose(): void
}

export default function Configuration(): m.Component<Attrs> {
	let auto = false

	return {
		oninit: ({attrs}) => {
			auto = !attrs.config.maxSwipePanels
		},
		oncreate: ({attrs, dom}) => {
			setTimeout(() => {
				const i = dom.querySelector('input')!
				i.focus()
			}, 100)
		},
		view: ({attrs: {config: c, onChange, onClose}}) => m('.configuration',
			m('h3', 'Settings'),
			m('form',
				{
					onsubmit: (e: Event) => {
						e.preventDefault()
						const form = e.currentTarget as HTMLFormElement
						onChange({
							maxSwipePanels: form.autoSwipePanels.checked
								? undefined
								: Number(form.maxSwipePanels.value) || 1,
							contentSize: form.contentSize.value as ContentSize,
							slideDuration: Number(form.slideDuration.value)
						})
					}
				},
				m('table.cfg',
					m('tr',
						m('td', 'Slide Duration:'),
						m('td',
							m('input', {
								type: 'number',
								min: 50, max: 1000,
								style: 'width: 4em',
								required: true,
								name: 'slideDuration',
								value: c.slideDuration
							})
						)
					),
					m('tr',
						m('td',
							{colspan: 2},
							m('input', {
								id: 'autoSwipePanels',
								type: 'checkbox',
								name: 'autoSwipePanels',
								checked: auto,
								onclick: (e: Event) => {
									auto = !auto
								}
							}),
							m('label', {for: 'autoSwipePanels'}, ' Auto Swipe Travel')
						)
					),
					m('tr',
						m('td',
							{style: `opacity: ${auto ? '0.5' : '1'}`},
							'Max Swipe Travel:'
						),
						m('td',
							m('input', {
								type: 'number',
								disabled: auto,
								required: !auto,
								min: 1, max: 100,
								style: 'width: 4em',
								name: 'maxSwipePanels',
								value: auto ? ''
									: c.maxSwipePanels != null ? c.maxSwipePanels : '1'
							})
						)
					),
					m('tr',
						m('td', 'Content Size:'),
						m('td',
							m('select',
								{
									//style: 'width: 4em',
									name: 'contentSize',
									value: c.contentSize
								},
								Object.keys(SIZES).map(s =>
									m('option', {value: s}, SIZES[s as ContentSize])
								)
							)
						)
					),
					m('tr',
						m('td', {colspan: 2, style: 'text-align: center'},
							m('button.btn-cfg', {type: 'button', onclick: onClose}, 'Cancel'),
							' ',
							m('button.btn-cfg', {type: 'submit'}, 'Update')
						)
					)
				)
			)
		)
	}
}
