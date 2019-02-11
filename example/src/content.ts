const cache = new Map<number, string[] | Promise<string[]>>()

/** Use BaconIpsum.com to generate some content for each panel */
export function get (id: number): string[] | Promise<string[]> {
	if (!cache.has(id)) {
		// Entry doesn't exist - start with a promise
		cache.set(id, fetch(
			'https://baconipsum.com/api/?type=meat-and-filler'
		).then(
			response => response.json() as Promise<string[]>
		).then(texts => {
			// When resolved, replace the promise with the
			// unwrapped value in the Map
			cache.set(id, texts)
			return texts
		}).catch(err => {
			cache.delete(id)
			throw new Error('Failed to fetch content for panel: ' + id)
		}))
	}
	return cache.get(id)!
}
