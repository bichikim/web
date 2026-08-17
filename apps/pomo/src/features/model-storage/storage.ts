import {failureResult, type Result, successResult} from './result'

// Transformers.js의 기존 캐시를 그대로 공유해 이미 받은 대용량 Qwen 파일의 재다운로드를 피한다.
export const MODEL_CACHE_NAME = 'transformers-cache'

export type ModelStorageOperation = 'delete' | 'open' | 'read' | 'write'

export interface ModelStorageError {
  readonly cause: unknown
  readonly operation: ModelStorageOperation
}

export interface ModelStorage {
  delete(key: string): Promise<Result<boolean, ModelStorageError>>
  get(key: string): Promise<Result<Response | null, ModelStorageError>>
  set(key: string, response: Response): Promise<Result<void, ModelStorageError>>
}

interface ModelCache {
  delete(request: RequestInfo | URL): Promise<boolean>
  match(request: RequestInfo | URL): Promise<Response | undefined>
  put(request: RequestInfo | URL, response: Response): Promise<void>
}

interface ModelCacheStorage {
  open(cacheName: string): Promise<ModelCache>
}

export interface CreateModelStorageOptions {
  readonly cacheName?: string
  readonly cacheStorage?: ModelCacheStorage | null
}

export const reportModelStorageError = (error: ModelStorageError) => {
  console.warn(`Model cache ${error.operation} failed.`, error.cause)
}

const getDefaultCacheStorage = (): ModelCacheStorage | null => {
  if (!('caches' in globalThis)) {
    return null
  }

  return globalThis.caches
}

/** Stores model resources in the platform Cache API namespace. */
export const createModelStorage = (options: CreateModelStorageOptions = {}): ModelStorage => {
  const cacheName = options.cacheName ?? MODEL_CACHE_NAME
  const cacheStorage =
    'cacheStorage' in options ? (options.cacheStorage ?? null) : getDefaultCacheStorage()

  const openCache = async (): Promise<Result<ModelCache, ModelStorageError>> => {
    if (cacheStorage === null) {
      return failureResult({
        cause: new Error('Cache API is unavailable.'),
        operation: 'open',
      })
    }

    try {
      return successResult(await cacheStorage.open(cacheName))
    } catch (cause: unknown) {
      return failureResult({cause, operation: 'open'})
    }
  }

  return {
    async delete(key) {
      const cacheResult = await openCache()

      if (!cacheResult.ok) {
        return cacheResult
      }

      try {
        return successResult(await cacheResult.value.delete(key))
      } catch (cause: unknown) {
        return failureResult({cause, operation: 'delete'})
      }
    },
    async get(key) {
      const cacheResult = await openCache()

      if (!cacheResult.ok) {
        return cacheResult
      }

      try {
        return successResult((await cacheResult.value.match(key)) ?? null)
      } catch (cause: unknown) {
        return failureResult({cause, operation: 'read'})
      }
    },
    async set(key, response) {
      const cacheResult = await openCache()

      if (!cacheResult.ok) {
        return cacheResult
      }

      try {
        await cacheResult.value.put(key, response)
        return successResult(undefined)
      } catch (cause: unknown) {
        return failureResult({cause, operation: 'write'})
      }
    },
  }
}
