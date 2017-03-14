// Math utils

/** Clamp n to range */
export function clamp (n: number, min: number, max: number) {
	return Math.min(Math.max(n, min), max)
}

/**  Always positive modulus */
export function pmod (n: number, m: number) {
	return ((n % m + m) % m)
}

/**
 * Trigonometric interpolation from x to y (smoothed at endpoints.)
 * a must be from 0.0 to 1.0. Eases in & out
 */
export function terp (x: number, y: number, a: number): number {
	const r = Math.PI * a
	const s = (1.0 - Math.cos(r)) * 0.5
	const t = 1.0 - s
	return (x * t + y * s)
}

/** Trigonometric interpolation. Eases in. */
export function terpIn (x: number, y: number, a: number): number {
	const r = (Math.PI / 2.0) * a
	const s = Math.sin(r)
	const t = 1.0 - s
	return (x * t + y * s)
}

/** Trigonometric interpolation. Eases out. */
export function terpOut (x: number, y: number, a: number): number {
	const r = (Math.PI / 2.0) * a
	const s = 1.0 - Math.cos(r)
	const t = 1.0 - s
	return (x * t + y * s)
}
