import type {ModelStorage, ModelStorageError} from './storage'

export interface TransformersModelCache {
  delete(request: string): Promise<boolean>
  match(request: string): Promise<Response | undefined>
  put(request: string, response: Response): Promise<void>
}

export interface CreateTransformersModelCacheOptions {
  readonly getStorageKey?: (request: string) => string
  readonly onError?: (error: ModelStorageError) => void
  readonly onStored?: (request: string) => Promise<void>
  readonly storage: ModelStorage
}

/** Adapts shared model storage to the Transformers.js custom cache contract. */
export const createTransformersModelCache = (
  options: CreateTransformersModelCacheOptions,
): TransformersModelCache => ({
  async delete(request) {
    const result = await options.storage.delete(options.getStorageKey?.(request) ?? request)

    if (!result.ok) {
      options.onError?.(result.error)
      return false
    }

    return result.value
  },
  async match(request) {
    const result = await options.storage.get(options.getStorageKey?.(request) ?? request)

    if (!result.ok) {
      options.onError?.(result.error)
      return undefined
    }

    return result.value ?? undefined
  },
  async put(request, response) {
    const storageKey = options.getStorageKey?.(request) ?? request
    const result = await options.storage.set(storageKey, response)

    if (!result.ok) {
      options.onError?.(result.error)
      return
    }

    if (storageKey !== request) {
      const cleanupResult = await options.storage.delete(request)

      if (!cleanupResult.ok) {
        options.onError?.(cleanupResult.error)
      }
    }

    // 완성본이 Cache API에 기록된 뒤에만 이어받기 조각을 지워 종료 시 저장 공백이 생기지 않게 한다.
    await options.onStored?.(request)
  },
})
