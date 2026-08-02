import {MemoryCache} from './memory-cache'

export class MemoryCacheStorage implements CacheStorage {
  readonly stores = new Map<string, MemoryCache>()

  async delete(cacheName: string): Promise<boolean> {
    return this.stores.delete(cacheName)
  }

  async has(cacheName: string): Promise<boolean> {
    return this.stores.has(cacheName)
  }

  async keys(): Promise<string[]> {
    return Array.from(this.stores.keys())
  }

  async match(
    request: RequestInfo | URL,
    options?: MultiCacheQueryOptions,
  ): Promise<Response | undefined> {
    if (options?.cacheName) {
      return this.stores.get(options.cacheName)?.match(request)
    }

    const responses = await Promise.all(
      Array.from(this.stores.values(), (cache) => cache.match(request)),
    )

    return responses.find((response) => response !== undefined)
  }

  async open(cacheName: string): Promise<Cache> {
    const cache = this.stores.get(cacheName) ?? new MemoryCache()

    this.stores.set(cacheName, cache)

    return cache
  }
}
