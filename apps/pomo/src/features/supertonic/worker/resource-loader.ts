// oxlint-disable no-await-in-loop -- Binary model chunks are consumed in order to preserve progress.
import {isAbortError} from 'src/utils/is-cancellation-reason'
import {concatBytes} from 'src/utils/concat-bytes'
import {httpFetch} from '../../http-client'
import {loadModelResource, type ModelStorage, reportModelStorageError} from '../../model-storage'
import {failureResult, type Result, successResult} from '../../result'
import type {CancelledError, DownloadFailedError} from '../errors'
import type {SupertonicProgress} from '../messages'
import type {LoadBufferOptions} from '../sessions'

export interface LoadJsonOptions {
  readonly fileName: string
  readonly signal: AbortSignal
  readonly url: string
}

interface ResourceLoaderOptions {
  readonly onProgress: (progress: SupertonicProgress) => void
  readonly storage: ModelStorage
}

type DownloadResult<Value> = Result<Value, CancelledError | DownloadFailedError>
const REQUEST_TIMEOUT_STATUS = 408
const TOO_MANY_REQUESTS_STATUS = 429
const SERVER_ERROR_STATUS = 500
const createDownloadError = (fileName: string, status: number | null): DownloadFailedError => ({
  code: 'download-failed',
  fileName,
  phase: 'download',
  retryable:
    status === null ||
    status === REQUEST_TIMEOUT_STATUS ||
    status === TOO_MANY_REQUESTS_STATUS ||
    status >= SERVER_ERROR_STATUS,
  status,
})

/** Loads speech resources, preserving uncached manifests, soft cache failures, and download-phase errors. */
export const createSupertonicResourceLoader = (options: ResourceLoaderOptions) => {
  const loadResource = async <Value>(
    request: LoadJsonOptions,
    read: (response: Response) => Promise<Value>,
    cache: 'shared' | 'none',
  ): Promise<DownloadResult<Value>> => {
    try {
      const resource =
        cache === 'shared'
          ? await loadModelResource({
              onStorageError: reportModelStorageError,
              signal: request.signal,
              storage: options.storage,
              url: request.url,
            })
          : {
              cacheWrite: null,
              response: await httpFetch(request.url, {cache: 'no-store', signal: request.signal}),
            }
      if (!resource.response.ok) {
        return failureResult(createDownloadError(request.fileName, resource.response.status))
      }
      const value = await read(resource.response)
      if (resource.cacheWrite !== null) {
        const result = await resource.cacheWrite
        if (!result.ok) {
          reportModelStorageError(result.error)
        }
      }
      return successResult(value)
    } catch (error: unknown) {
      return failureResult(
        error instanceof DOMException && isAbortError(error)
          ? {code: 'cancelled', phase: 'download', retryable: false}
          : createDownloadError(request.fileName, null),
      )
    }
  }

  const readBuffer = async (
    response: Response,
    request: LoadBufferOptions,
  ): Promise<ArrayBuffer> => {
    if (response.body === null) {
      return response.arrayBuffer()
    }
    const reader = response.body.getReader()
    const chunks: Array<Uint8Array> = []
    let received = 0
    while (true) {
      const result = await reader.read()
      if (result.done) {
        break
      }
      chunks.push(result.value)
      received += result.value.byteLength
      options.onProgress({
        fileName: request.fileName,
        loadedBytes: request.loadedBefore + Math.min(received, request.expectedSize),
        totalBytes: request.totalBytes,
      })
    }
    return concatBytes(chunks, received).buffer
  }

  return {
    loadBuffer: (request: LoadBufferOptions) =>
      loadResource(request, (response) => readBuffer(response, request), 'shared'),
    loadJson: (request: LoadJsonOptions) =>
      loadResource<unknown>(request, (response) => response.json(), 'shared'),
    loadManifest: (request: LoadJsonOptions) =>
      loadResource<unknown>(request, (response) => response.json(), 'none'),
  }
}
