import {clamp} from './math'

export interface SwipeOptions {
	/** Current panel index */
	panelId: number
	/** Current drag position in pixels (always a negative number) */
	x: number
	/** Velocity of swipe in pixels/second */
	xv: number
	/** Width of 1 panel in pixels */
	panelWidth: number
	/** Maximum swipe panel travel */
	maxSwipePanels: number
	/** Total # of panels */
	totalPanels: number
	/** Typical duration of 1 panel swipe */
	unitDuration: number
}

export interface SwipeResult {
	panelId: number
	duration: number
}

/**
 * Compute "throw" from swipe
 */
export function swipe ({
	panelId, x, xv, panelWidth, maxSwipePanels, totalPanels, unitDuration
}: SwipeOptions): SwipeResult {
	/** Minimum duration of animation */
	const MIN_DUR_MS = 17
	/** Max throw velocity */
	const MAX_VEL = 10000
	/* max distance we can travel */
	//const MAX_DIST = maxSwipePanels
	/** swipe velocity in px/s clamped to sane range */
	const xvel = clamp(xv, -MAX_VEL, MAX_VEL)
	/** Destination position */
	const destX = x + xvel * 0.5
	/** Current index panel (where it is currently dragged to, not its resting position) */
	const p0 = Math.floor(-x / panelWidth)
	/** Destination panel index */
	let destPanel = Math.round(-destX / panelWidth)
	if (destPanel - p0 > maxSwipePanels) {
		destPanel = p0 + maxSwipePanels
	} else if (p0 - destPanel > maxSwipePanels) {
		destPanel = p0 - maxSwipePanels
	}
	destPanel = clamp(destPanel,
		Math.max(0, panelId - maxSwipePanels),
		Math.min(totalPanels - 1, panelId + maxSwipePanels)
	)
	/** How many panels (incl. fractions) are we travelling across */
	const unitDist = (destPanel * panelWidth - (-x)) / panelWidth
	const absUnitDist = Math.abs(unitDist)
	/** Duration of the animation */
	let dur = 0
	if (absUnitDist > 1) {
		// Compute a duration suitable for travelling multiple panels
		dur = Math.max(
			MIN_DUR_MS,
			unitDuration! * Math.pow(absUnitDist, 0.25) * 1.0
		)
	} else {
		// Compute a duration suitable for 1 or less panel travel
		dur = Math.max(MIN_DUR_MS, unitDuration * absUnitDist) //(absUnitDist * cfg.visiblePanels))
		if (Math.sign(unitDist) === -Math.sign(xvel)) {
			// Swipe in same direction of travel - speed up animation relative to swipe speed
			const timeScale = Math.max(Math.abs(xvel / 1000), 1)
			dur = Math.max(MIN_DUR_MS, dur / timeScale)
		} else {
			// Swipe in opposite direction -- TODO: anything?
		}
	}
	return {panelId: destPanel, duration: dur}
}
