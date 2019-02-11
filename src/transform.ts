// Determine style names (if prefix required)

function toLower (s: any) {
	return !!s && typeof s === 'string' ? s.toLowerCase() : ''
}

export const prefix = (function() {
	const t = 'translate3d(100px,20px,0px)' // the transform we'll use to test
	const el = document.createElement('div') // Make a test element

	//  Check support for current standard first
	el.style.transform = t
	let styleAttrLc = toLower(el.getAttribute('style'))
	if (styleAttrLc.indexOf('transform') === 0) {
		return '' // current, yay.
	}

	//  Try beta names
	// tslint:disable align
	(el.style as any).MozTransform = t // firefox
	;(el.style as any).webkitTransform = t // webkit/chrome
	;(el.style as any).msTransform = t // IE
	styleAttrLc = toLower(el.getAttribute('style'))

	//  See which one worked, if any...
	if (styleAttrLc.indexOf('moz') !== -1) {
		return 'moz'
	} else if (styleAttrLc.indexOf('webkit') !== -1) {
		return 'webkit'
	} else if (styleAttrLc.indexOf('ms') !== -1) {
		return 'ms'
	}
	console.warn("CSS transform style not supported.")
	return ''
})()

export const transform = prefix ? prefix + '-transform' : 'transform'

/**
 * Set position of element using 3d transform style
 */
export function setPos3d (el: HTMLElement, x: number, y = 0, z = 0) {
	(el.style as any)[transform] = `translate3d(${x}px,${y}px,${z}px)`
}
