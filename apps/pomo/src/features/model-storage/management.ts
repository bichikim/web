import {failureResult, type Result, successResult} from '../result'
import {MODEL_CACHE_NAME} from './storage'

const PARTIAL_DIRECTORY_NAME = 'pomo-model-downloads'

export type ModelStorageManagementOperation =
  | 'clear-cache'
  | 'clear-partials'
  | 'delete-entry'
  | 'inspect'

export interface ModelStorageManagementError {
  readonly cause: unknown
  readonly operation: ModelStorageManagementOperation
}

export interface ModelStorageSnapshot {
  readonly cacheEntries: ReadonlyArray<string>
  readonly partialFileCount: number
  readonly partialStorageAvailable: boolean
}

export interface ModelStorageManager {
  clearCache(): Promise<Result<boolean, ModelStorageManagementError>>
  clearPartialDownloads(): Promise<Result<boolean, ModelStorageManagementError>>
  deleteCacheEntry(key: string): Promise<Result<boolean, ModelStorageManagementError>>
  inspect(): Promise<Result<ModelStorageSnapshot, ModelStorageManagementError>>
}

interface ManagedCache {
  delete(request: RequestInfo | URL): Promise<boolean>
  keys(): Promise<ReadonlyArray<Request>>
}

interface ManagedCacheStorage {
  delete(cacheName: string): Promise<boolean>
  open(cacheName: string): Promise<ManagedCache>
}

interface ManagedDirectoryEntry {
  readonly kind: 'directory' | 'file'
}

interface ManagedDirectory {
  values(): AsyncIterableIterator<ManagedDirectoryEntry>
}

interface ManagedStorageRoot {
  getDirectoryHandle(name: string): Promise<ManagedDirectory>
  removeEntry(name: string, options: {readonly recursive: true}): Promise<void>
}

export interface CreateModelStorageManagerOptions {
  readonly cacheName?: string
  readonly cacheStorage?: ManagedCacheStorage | null
  readonly getStorageRoot?: (() => Promise<ManagedStorageRoot>) | null
}

const isNotFoundError = (error: unknown) =>
  typeof error === 'object' && error !== null && 'name' in error && error.name === 'NotFoundError'

const getDefaultCacheStorage = (): ManagedCacheStorage | null =>
  'caches' in globalThis ? globalThis.caches : null

const getDefaultStorageRoot = (): (() => Promise<ManagedStorageRoot>) | null => {
  if (
    typeof navigator === 'undefined' ||
    !('storage' in navigator) ||
    typeof navigator.storage.getDirectory !== 'function'
  ) {
    return null
  }

  return () => navigator.storage.getDirectory()
}

const countPartialFiles = async (getStorageRoot: () => Promise<ManagedStorageRoot>) => {
  try {
    const root = await getStorageRoot()
    const directory = await root.getDirectoryHandle(PARTIAL_DIRECTORY_NAME)
    let count = 0

    for await (const entry of directory.values()) {
      if (entry.kind === 'file') {
        count += 1
      }
    }

    return count
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return 0
    }

    throw error
  }
}

/** Manages only the cache and partial-download namespace owned by local model loading. */
export const createModelStorageManager = (
  options: CreateModelStorageManagerOptions = {},
): ModelStorageManager => {
  const cacheName = options.cacheName ?? MODEL_CACHE_NAME
  const cacheStorage =
    'cacheStorage' in options ? (options.cacheStorage ?? null) : getDefaultCacheStorage()
  const getStorageRoot =
    'getStorageRoot' in options ? (options.getStorageRoot ?? null) : getDefaultStorageRoot()

  return {
    async clearCache() {
      if (cacheStorage === null) {
        return failureResult({
          cause: new Error('Cache API is unavailable.'),
          operation: 'clear-cache',
        })
      }

      try {
        return successResult(await cacheStorage.delete(cacheName))
      } catch (cause: unknown) {
        return failureResult({cause, operation: 'clear-cache'})
      }
    },
    async clearPartialDownloads() {
      if (getStorageRoot === null) {
        return failureResult({
          cause: new Error('Origin private file system is unavailable.'),
          operation: 'clear-partials',
        })
      }

      try {
        const root = await getStorageRoot()
        await root.removeEntry(PARTIAL_DIRECTORY_NAME, {recursive: true})
        return successResult(true)
      } catch (cause: unknown) {
        return isNotFoundError(cause)
          ? successResult(false)
          : failureResult({cause, operation: 'clear-partials'})
      }
    },
    async deleteCacheEntry(key) {
      if (cacheStorage === null) {
        return failureResult({
          cause: new Error('Cache API is unavailable.'),
          operation: 'delete-entry',
        })
      }

      try {
        const cache = await cacheStorage.open(cacheName)
        return successResult(await cache.delete(key))
      } catch (cause: unknown) {
        return failureResult({cause, operation: 'delete-entry'})
      }
    },
    async inspect() {
      if (cacheStorage === null) {
        return failureResult({cause: new Error('Cache API is unavailable.'), operation: 'inspect'})
      }

      try {
        const cache = await cacheStorage.open(cacheName)
        const requests = await cache.keys()
        const partialFileCount =
          getStorageRoot === null ? 0 : await countPartialFiles(getStorageRoot)

        return successResult({
          cacheEntries: requests.map((request) => request.url).sort(),
          partialFileCount,
          partialStorageAvailable: getStorageRoot !== null,
        })
      } catch (cause: unknown) {
        return failureResult({cause, operation: 'inspect'})
      }
    },
  }
}
