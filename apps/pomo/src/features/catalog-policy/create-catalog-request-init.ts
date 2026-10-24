/** Disables catalog caching during development and preserves the caller's cancellation signal. */
export const createCatalogRequestInit = (signal?: AbortSignal): RequestInit => ({
  cache: import.meta.env.DEV ? 'no-store' : 'default',
  signal,
})
