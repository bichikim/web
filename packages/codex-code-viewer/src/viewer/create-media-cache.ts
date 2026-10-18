import {createBoundedCache} from '../shared/create-bounded-cache'

export interface MediaLoad {
  readonly onProgress: (percent: number) => void
  readonly signal: AbortSignal
}
interface MediaRequest {
  readonly load: (request: MediaLoad) => Promise<Blob>
  readonly mimeType: string
  readonly onProgress?: (percent: number) => void
  readonly path: string
  readonly revision: string
  readonly session: string
  readonly size: number
}
interface MediaConsumer {
  readonly onProgress?: (percent: number) => void
}
interface PendingMedia {
  readonly controller: AbortController
  readonly consumers: Set<MediaConsumer>
  readonly result: Promise<Blob>
}
export interface MediaLease {
  readonly result: Promise<Blob>
  release(): void
}
export interface MediaCache {
  acquire(request: MediaRequest): MediaLease
  clear(): void
}
interface MediaCacheOptions {
  readonly maxBytes?: number
  readonly maxEntries?: number
}

/** Shares transfers and retains at most eight completed Blobs within 64 MiB by default. */
export const createMediaCache = (options: MediaCacheOptions = {}): MediaCache => {
  const MAX_BLOBS = 8
  const MAX_BLOB_BYTES = 67108864
  const PERCENT = 100
  const completed = createBoundedCache<Blob>({
    maxEntries: options.maxEntries ?? MAX_BLOBS,
    maxWeight: options.maxBytes ?? MAX_BLOB_BYTES,
    weight: (blob) => blob.size,
  })
  const pending = new Map<string, PendingMedia>()
  const begin = (key: string, request: MediaRequest): PendingMedia => {
    const controller = new AbortController()
    const consumers = new Set<MediaConsumer>()
    const onProgress = (percent: number): void => {
      for (const consumer of consumers) {
        consumer.onProgress?.(percent)
      }
    }
    const result = Promise.resolve()
      .then(() => {
        controller.signal.throwIfAborted()
        return request.load({onProgress, signal: controller.signal})
      })
      .then((blob) => {
        controller.signal.throwIfAborted()
        if (blob.size !== request.size) {
          throw new Error('미디어 데이터를 읽지 못했습니다.')
        }
        completed.set(key, blob)
        return blob
      })
      .finally(() => {
        if (pending.get(key)?.result === result) {
          pending.delete(key)
        }
      })
    const entry = {consumers, controller, result}
    pending.set(key, entry)
    return entry
  }
  return {
    acquire: (request) => {
      const key = JSON.stringify([
        request.session,
        request.path,
        request.revision,
        request.mimeType,
        request.size,
      ])
      const blob = completed.get(key)
      if (blob !== undefined) {
        request.onProgress?.(PERCENT)
        return {
          release: () => {
            // No transfer remains to cancel; the cache owns the retained Blob.
          },
          result: Promise.resolve(blob),
        }
      }
      const entry = pending.get(key) ?? begin(key, request)
      const consumer = {onProgress: request.onProgress}
      entry.consumers.add(consumer)
      return {
        release: () => {
          entry.consumers.delete(consumer)
          if (entry.consumers.size === 0 && pending.get(key) === entry) {
            pending.delete(key)
            entry.controller.abort()
          }
        },
        result: entry.result,
      }
    },
    clear: () => {
      for (const entry of pending.values()) {
        entry.controller.abort()
      }
      pending.clear()
      completed.clear()
    },
  }
}
