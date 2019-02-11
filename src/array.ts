/** Generate an array sequence of num numbers starting from 0 incrementing by 1 */
export function range (num: number): number[]
/** Generate an array sequence of numbers starting from start up to but not including end, incrementing by 1 */
export function range (start: number, end: number): number[] // tslint:disable-line unified-signatures
/** Generate an array sequence of numbers from start up to but not including end incrementing by step */
export function range (start: number, end?: number, step?: number): number[] {
	step = step || 1
	if (end == null) {
		end = start
		start = 0
	}
	const size = Math.ceil((end - start) / step)
	const a: number[] = []
	for (let i = 0; i < size; ++i) {
		a.push(start + step * i)
	}
	return a
}
