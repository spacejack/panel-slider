// This is a placeholder module that generates example content
// from some public APIs.
// This is used to demonstrate panels having async content.

const cache = new Map<number, string[] | Promise<string[]>>()

/**
 * Return what's available for this panel but don't initiate any fetch.
 */
export function peek (panelId: number): string[] | Promise<string[]> | undefined {
	return cache.get(panelId)
}

/**
 * Return content if ready as an array.
 * Otherwise return a promise; initiate a fetch
 * or return an already pending promise.
 */
export function get (id: number): string[] | Promise<string[]> {
	if (!cache.has(id)) {
		// Entry doesn't exist - start with a promise
		console.log('fetching panel: ' + id)
		// Use BaconIpsum.com to generate some content for each panel
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
			throw new Error(
				`Failed to fetch content for panel ${id}: ${err.message}`
			)
		}))
	}
	return cache.get(id)!
}
