// Math utils

/** Clamp n to range */
export function clamp (n: number, min: number, max: number) {
	return Math.min(Math.max(n, min), max)
}

/**  Always positive modulus */
export function pmod (n: number, m: number) {
	return ((n % m + m) % m)
}
