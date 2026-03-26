/**
 * Module-level registry for token getter functions, keyed by WebSocket URL.
 *
 * dexie-syncable serializes the `options` object into IndexedDB via
 * structured clone, which cannot handle functions. This registry keeps
 * the getToken function out of `options` so it survives serialization
 * while remaining accessible to the sync protocol on every (re)connect.
 */

type GetTokenFn = (options?: { forceRefresh?: boolean }) => Promise<string>

const registry = new Map<string, GetTokenFn>()

export function setTokenGetter(url: string, fn: GetTokenFn): void {
    registry.set(url, fn)
}

export function getTokenGetter(url: string): GetTokenFn | undefined {
    return registry.get(url)
}
