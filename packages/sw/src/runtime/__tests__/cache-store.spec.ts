import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {type CacheStoreOptions, createCacheStore} from '../cache-store'
import type {CacheMetadata, Logger} from '../types'
import {MemoryCacheStorage} from './cache-storage'

const CACHE_NAME = 'test-cache-v1'
const METADATA_NAME = `${CACHE_NAME}-meta`
const METADATA_URL = 'https://example.com/__sw_cache_metadata__'

const readMetadata = async (cacheStorage: MemoryCacheStorage): Promise<CacheMetadata> => {
  const cache = await cacheStorage.open(METADATA_NAME)
  const response = await cache.match(METADATA_URL)

  return response ? ((await response.json()) as CacheMetadata) : {}
}

describe('createCacheStore', () => {
  let cacheStorage: MemoryCacheStorage
  let log: ReturnType<typeof vi.fn<Logger>>

  const createOptions = (overrides: Partial<CacheStoreOptions> = {}): CacheStoreOptions => ({
    appFileUrls: new Set(),
    cacheMetadataName: METADATA_NAME,
    cacheMetadataUrl: METADATA_URL,
    cacheName: CACHE_NAME,
    cachePriorities: {default: 1},
    log,
    ...overrides,
  })

  beforeEach(() => {
    cacheStorage = new MemoryCacheStorage()
    log = vi.fn<Logger>()
    vi.stubGlobal('caches', cacheStorage)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should retain metadata for concurrent cache writes', async () => {
    const cacheStore = createCacheStore(createOptions())
    const firstRequest = new Request('https://example.com/first.js')
    const secondRequest = new Request('https://example.com/second.js')

    await Promise.all([
      cacheStore.put(firstRequest, new Response('first'), 'script'),
      cacheStore.put(secondRequest, new Response('second'), 'script'),
    ])

    const metadata = await readMetadata(cacheStorage)

    expect(Object.keys(metadata).sort()).toEqual([firstRequest.url, secondRequest.url])
  })

  it('should remove an expired response and its metadata', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const cacheStore = createCacheStore(createOptions({cacheMaxAgeSeconds: 1}))
    const request = new Request('https://example.com/expired.js')

    await cacheStore.put(request, new Response('cached'), 'script')
    vi.setSystemTime(new Date('2026-01-01T00:00:02.000Z'))

    await expect(cacheStore.get(request, 'script')).resolves.toBeUndefined()

    const cache = await cacheStorage.open(CACHE_NAME)
    const metadata = await readMetadata(cacheStorage)

    await expect(cache.match(request)).resolves.toBeUndefined()
    expect(metadata[request.url]).toBeUndefined()
  })

  it('should remove older expired entries while caching a new response', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const cacheStore = createCacheStore(createOptions({cacheMaxAgeSeconds: 1}))
    const expiredRequest = new Request('https://example.com/old.js')
    const freshRequest = new Request('https://example.com/new.js')

    await cacheStore.put(expiredRequest, new Response('old'), 'script')
    vi.setSystemTime(new Date('2026-01-01T00:00:02.000Z'))
    await cacheStore.put(freshRequest, new Response('new'), 'script')

    const cache = await cacheStorage.open(CACHE_NAME)

    await expect(cache.match(expiredRequest)).resolves.toBeUndefined()
    await expect(cache.match(freshRequest)).resolves.toBeDefined()
  })

  it('should trim the lowest-priority entry before app assets', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const appUrl = 'https://example.com/app.js'
    const lowPriorityRequest = new Request('https://example.com/data.json')
    const imageRequest = new Request('https://example.com/image.png')
    const appRequest = new Request(appUrl)
    const cacheStore = createCacheStore(
      createOptions({
        appFileUrls: new Set([appUrl]),
        cacheMaxEntries: 2,
        cachePriorities: {default: 1, image: 2, script: 4},
      }),
    )

    await cacheStore.put(lowPriorityRequest, new Response('data'), 'default')
    vi.advanceTimersByTime(1)
    await cacheStore.put(imageRequest, new Response('image'), 'image')
    vi.advanceTimersByTime(1)
    await cacheStore.put(appRequest, new Response('app'), 'script')

    const cache = await cacheStorage.open(CACHE_NAME)
    const metadata = await readMetadata(cacheStorage)

    await expect(cache.match(lowPriorityRequest)).resolves.toBeUndefined()
    await expect(cache.match(imageRequest)).resolves.toBeDefined()
    await expect(cache.match(appRequest)).resolves.toBeDefined()
    expect(metadata[appUrl]?.priority).toBe(10)
  })

  it('should recover from malformed cache metadata', async () => {
    const metadataCache = await cacheStorage.open(METADATA_NAME)

    await metadataCache.put(METADATA_URL, new Response('{invalid'))

    const cacheStore = createCacheStore(createOptions())
    const request = new Request('https://example.com/recovered.js')

    await cacheStore.put(request, new Response('cached'), 'script')

    const metadata = await readMetadata(cacheStorage)

    expect(metadata[request.url]).toMatchObject({destination: 'script', priority: 1})
  })

  it('should skip failed and html fallback subresource responses', async () => {
    const cacheStore = createCacheStore(createOptions())
    const failedRequest = new Request('https://example.com/failed.js')
    const fallbackRequest = new Request('https://example.com/missing.js')

    await cacheStore.put(failedRequest, new Response('failed', {status: 500}), 'script')
    await cacheStore.put(
      fallbackRequest,
      new Response('<!doctype html>', {headers: {'content-type': 'text/html'}}),
      'script',
    )

    const cache = await cacheStorage.open(CACHE_NAME)

    await expect(cache.match(failedRequest)).resolves.toBeUndefined()
    await expect(cache.match(fallbackRequest)).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledTimes(2)
  })

  it('should skip opaque responses', async () => {
    const cacheStore = createCacheStore(createOptions())
    const request = new Request('https://example.com/private.js')
    const response = new Response('private')

    Object.defineProperty(response, 'type', {value: 'opaque'})

    await cacheStore.put(request, response, 'script')

    const cache = await cacheStorage.open(CACHE_NAME)

    await expect(cache.match(request)).resolves.toBeUndefined()
  })

  it('should cache extensionless html subresources', async () => {
    const cacheStore = createCacheStore(createOptions())
    const request = new Request('https://example.com/api/content')

    await cacheStore.put(
      request,
      new Response('<article>content</article>', {headers: {'content-type': 'text/html'}}),
      'default',
    )

    await expect(cacheStore.get(request, 'default')).resolves.toBeDefined()
  })

  it('should cache responses without a content type', async () => {
    const cacheStore = createCacheStore(createOptions())
    const request = new Request('https://example.com/empty')

    await cacheStore.put(request, new Response(null), 'default')

    await expect(cacheStore.get(request, 'default')).resolves.toBeDefined()
  })

  it('should cache html responses for document requests', async () => {
    const cacheStore = createCacheStore(createOptions())
    const request = new Request('https://example.com/page')

    await cacheStore.put(
      request,
      new Response('<!doctype html>', {headers: {'content-type': 'text/html'}}),
      'document',
    )

    await expect(cacheStore.get(request, 'document')).resolves.toBeDefined()
  })

  it('should return undefined for a cache miss', async () => {
    const cacheStore = createCacheStore(createOptions())
    const request = new Request('https://example.com/missing.js')

    await expect(cacheStore.get(request, 'script')).resolves.toBeUndefined()
  })

  it('should not create recursive metadata for the metadata URL', async () => {
    const cacheStore = createCacheStore(createOptions())
    const request = new Request(METADATA_URL)

    await cacheStore.put(request, new Response('metadata'), 'default')

    await expect(readMetadata(cacheStorage)).resolves.toEqual({})
  })

  it('should recover the metadata queue after a write failure', async () => {
    const metadataCache = await cacheStorage.open(METADATA_NAME)
    const putMetadata = vi.spyOn(metadataCache, 'put').mockRejectedValueOnce(new Error('disk full'))
    const cacheStore = createCacheStore(createOptions())
    const failedRequest = new Request('https://example.com/failed-write.js')
    const recoveredRequest = new Request('https://example.com/recovered-write.js')

    await expect(cacheStore.put(failedRequest, new Response('failed'), 'script')).rejects.toThrow(
      'disk full',
    )
    await expect(
      cacheStore.put(recoveredRequest, new Response('recovered'), 'script'),
    ).resolves.toBeUndefined()

    expect(putMetadata).toHaveBeenCalledTimes(2)
    expect(await readMetadata(cacheStorage)).toHaveProperty(recoveredRequest.url)
  })

  it('should prune metadata whose cache entry no longer exists', async () => {
    const staleUrl = 'https://example.com/stale.js'
    const metadataCache = await cacheStorage.open(METADATA_NAME)

    await metadataCache.put(
      METADATA_URL,
      new Response(
        JSON.stringify({
          [staleUrl]: {
            cachedAt: 1,
            destination: 'script',
            lastAccessed: 1,
            priority: 1,
          },
        }),
      ),
    )

    const cacheStore = createCacheStore(createOptions())
    const request = new Request('https://example.com/fresh.js')

    await cacheStore.put(request, new Response('fresh'), 'script')

    const metadata = await readMetadata(cacheStorage)

    expect(metadata).not.toHaveProperty(staleUrl)
    expect(metadata).toHaveProperty(request.url)
  })

  it('should recreate missing metadata with the built-in priority', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const request = new Request('https://example.com/orphan.js')
    const cache = await cacheStorage.open(CACHE_NAME)

    await cache.put(request, new Response('orphan'))

    const cacheStore = createCacheStore(createOptions({cachePriorities: {}}))

    await expect(cacheStore.get(request, 'script')).resolves.toBeDefined()
    expect(await readMetadata(cacheStorage)).toMatchObject({
      [request.url]: {cachedAt: Date.now(), priority: 1},
    })
  })

  it('should trim the least recently accessed entry when priorities match', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const firstRequest = new Request('https://example.com/first.js')
    const secondRequest = new Request('https://example.com/second.js')
    const cacheStore = createCacheStore(createOptions({cacheMaxEntries: 1}))

    await cacheStore.put(firstRequest, new Response('first'), 'script')
    vi.advanceTimersByTime(1)
    await cacheStore.put(secondRequest, new Response('second'), 'script')

    const cache = await cacheStorage.open(CACHE_NAME)

    await expect(cache.match(firstRequest)).resolves.toBeUndefined()
    await expect(cache.match(secondRequest)).resolves.toBeDefined()
  })
})
