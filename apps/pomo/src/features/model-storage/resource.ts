import {type Result, successResult} from './result'
import type {ModelStorage, ModelStorageError} from './storage'

export interface LoadModelResourceOptions {
  readonly fetcher?: typeof fetch
  readonly onStorageError?: (error: ModelStorageError) => void
  readonly signal?: AbortSignal
  readonly storage: ModelStorage
  readonly url: string
}

export interface ModelResource {
  readonly cacheWrite: Promise<Result<void, ModelStorageError>>
  readonly response: Response
  readonly source: 'cache' | 'network'
}

/** Loads a model resource from shared storage before falling back to the network. */
export const loadModelResource = async (
  options: LoadModelResourceOptions,
): Promise<ModelResource> => {
  const storedResult = await options.storage.get(options.url)

  if (storedResult.ok && storedResult.value !== null) {
    return {
      cacheWrite: Promise.resolve(successResult(undefined)),
      response: storedResult.value,
      source: 'cache',
    }
  }

  if (!storedResult.ok) {
    options.onStorageError?.(storedResult.error)
  }

  const response = await (options.fetcher ?? fetch)(options.url, {
    cache: 'no-store',
    signal: options.signal,
  })

  return {
    cacheWrite: response.ok
      ? options.storage.set(options.url, response.clone())
      : Promise.resolve(successResult(undefined)),
    response,
    source: 'network',
  }
}
