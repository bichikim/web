import type {
  CacheDestination,
  CacheMetadata,
  CacheMetadataEntry,
  CachePriorityConfig,
  Logger,
} from './types'

const APP_FILE_PRIORITY = 10
const MILLISECONDS_PER_SECOND = 1000

const HTML_FALLBACK_SENSITIVE_EXTENSIONS = new Set([
  '.css',
  '.js',
  '.json',
  '.m4a',
  '.mp3',
  '.ogg',
  '.wasm',
  '.wav',
  '.webm',
])

export interface CacheStoreOptions {
  appFileUrls: Set<string>
  cacheMetadataName: string
  cacheMetadataUrl: string
  cacheName: string
  cacheMaxAgeSeconds?: number
  cacheMaxEntries?: number
  cachePriorities: CachePriorityConfig
  log: Logger
}

export interface CacheStore {
  get: (request: Request, destination: CacheDestination) => Promise<Response | undefined>
  put: (request: Request, response: Response, destination: CacheDestination) => Promise<void>
}

const getUrlExtension = (url: string) => {
  const {pathname} = new URL(url)
  const lastSlashIndex = pathname.lastIndexOf('/')
  const lastDotIndex = pathname.lastIndexOf('.')

  if (lastDotIndex <= lastSlashIndex) {
    return ''
  }

  return pathname.slice(lastDotIndex).toLowerCase()
}

const isCacheableResponse = (
  request: Request,
  response: Response,
  destination: CacheDestination,
) => {
  if (!response.ok || response.type === 'opaque') {
    return false
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('text/html')) {
    return true
  }

  if (destination === 'document') {
    return true
  }

  return !HTML_FALLBACK_SENSITIVE_EXTENSIONS.has(getUrlExtension(request.url))
}

const readMetadata = async (metadataName: string, metadataUrl: string): Promise<CacheMetadata> => {
  const cache = await caches.open(metadataName)
  const response = await cache.match(metadataUrl)

  if (!response) {
    return {}
  }

  try {
    return (await response.json()) as CacheMetadata
  } catch {
    return {}
  }
}

const writeMetadata = async (
  metadataName: string,
  metadataUrl: string,
  metadata: CacheMetadata,
): Promise<void> => {
  const cache = await caches.open(metadataName)

  await cache.put(
    metadataUrl,
    new Response(JSON.stringify(metadata), {
      headers: {'Content-Type': 'application/json'},
    }),
  )
}

const createMetadataEntry = (options: {
  destination: CacheDestination
  existing?: CacheMetadataEntry
  isNew: boolean
  now: number
  priority: number
}): CacheMetadataEntry => ({
  cachedAt: options.isNew ? options.now : (options.existing?.cachedAt ?? options.now),
  destination: options.destination,
  lastAccessed: options.now,
  priority: options.priority,
})

export const createCacheStore = (options: CacheStoreOptions): CacheStore => {
  let metadataQueue = Promise.resolve()

  const runMetadataOperation = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = metadataQueue.then(operation, operation)
    metadataQueue = result.then(
      () => undefined,
      () => undefined,
    )

    return result
  }

  const resolvePriority = (destination: CacheDestination, url: string) => {
    const basePriority =
      options.cachePriorities[destination] ?? options.cachePriorities.default ?? 1

    return options.appFileUrls.has(url) ? Math.max(basePriority, APP_FILE_PRIORITY) : basePriority
  }

  const pruneMetadata = async (cache: Cache, metadata: CacheMetadata) => {
    const existingUrls = new Set((await cache.keys()).map((request) => request.url))
    const nextMetadata: CacheMetadata = {}

    for (const [url, entry] of Object.entries(metadata)) {
      if (existingUrls.has(url)) {
        nextMetadata[url] = entry
      }
    }

    if (Object.keys(nextMetadata).length !== Object.keys(metadata).length) {
      await writeMetadata(options.cacheMetadataName, options.cacheMetadataUrl, nextMetadata)
    }

    return nextMetadata
  }

  const removeExpiredEntries = async (cache: Cache, metadata: CacheMetadata) => {
    if (!options.cacheMaxAgeSeconds) {
      return metadata
    }

    const maxAgeMs = options.cacheMaxAgeSeconds * MILLISECONDS_PER_SECOND
    const now = Date.now()
    const nextMetadata: CacheMetadata = {...metadata}

    const expiredUrls = Object.entries(metadata)
      .filter(([, entry]) => now - entry.cachedAt > maxAgeMs)
      .map(([url]) => url)

    await Promise.all(expiredUrls.map((url) => cache.delete(url)))

    for (const url of expiredUrls) {
      delete nextMetadata[url]
    }

    if (Object.keys(nextMetadata).length !== Object.keys(metadata).length) {
      await writeMetadata(options.cacheMetadataName, options.cacheMetadataUrl, nextMetadata)
    }

    return nextMetadata
  }

  const trimCache = async (cache: Cache, metadata: CacheMetadata) => {
    if (!options.cacheMaxEntries) {
      return
    }

    const entries = Object.entries(metadata)

    if (entries.length <= options.cacheMaxEntries) {
      return
    }

    entries.sort((left, right) => {
      const priorityDelta = left[1].priority - right[1].priority

      return priorityDelta === 0 ? left[1].lastAccessed - right[1].lastAccessed : priorityDelta
    })

    const removalCount = entries.length - options.cacheMaxEntries
    const urlsToRemove = entries.slice(0, removalCount).map(([url]) => url)

    await Promise.all(urlsToRemove.map((url) => cache.delete(url)))

    for (const url of urlsToRemove) {
      delete metadata[url]
    }

    await writeMetadata(options.cacheMetadataName, options.cacheMetadataUrl, metadata)
  }

  const updateMetadata = async (
    cache: Cache,
    url: string,
    destination: CacheDestination,
    isNew: boolean,
  ) => {
    if (url === options.cacheMetadataUrl) {
      return
    }

    const metadata = await readMetadata(options.cacheMetadataName, options.cacheMetadataUrl)
    const now = Date.now()
    const nextMetadata = {
      ...metadata,
      [url]: createMetadataEntry({
        destination,
        existing: metadata[url],
        isNew,
        now,
        priority: resolvePriority(destination, url),
      }),
    }

    await writeMetadata(options.cacheMetadataName, options.cacheMetadataUrl, nextMetadata)

    const prunedMetadata = await pruneMetadata(cache, nextMetadata)
    const freshMetadata = await removeExpiredEntries(cache, prunedMetadata)

    await trimCache(cache, freshMetadata)
  }

  const get = async (request: Request, destination: CacheDestination) => {
    const cache = await caches.open(options.cacheName)
    const response = await cache.match(request)

    if (!response) {
      return
    }

    return runMetadataOperation(async () => {
      const metadata = await readMetadata(options.cacheMetadataName, options.cacheMetadataUrl)
      const entry = metadata[request.url]

      if (
        entry &&
        options.cacheMaxAgeSeconds &&
        Date.now() - entry.cachedAt > options.cacheMaxAgeSeconds * MILLISECONDS_PER_SECOND
      ) {
        await cache.delete(request)
        delete metadata[request.url]
        await writeMetadata(options.cacheMetadataName, options.cacheMetadataUrl, metadata)

        return
      }

      await updateMetadata(cache, request.url, destination, false)

      return response
    })
  }

  const put = async (request: Request, response: Response, destination: CacheDestination) => {
    if (!isCacheableResponse(request, response, destination)) {
      options.log('debug', 'Skipped non-cacheable response', {
        contentType: response.headers.get('content-type'),
        destination,
        status: response.status,
        type: response.type,
        url: request.url,
      })

      return
    }

    const cache = await caches.open(options.cacheName)

    await cache.put(request, response.clone())
    await runMetadataOperation(() => updateMetadata(cache, request.url, destination, true))
  }

  return {get, put}
}
