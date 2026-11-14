import type {PuppetDocument} from './document'
import {encodeFile} from './poffo-file/encode-file'
import {compactDocumentTextures} from './texture-assets'

export interface SerializePoffoDocumentOptions {
  /** Cancels this independent export and terminates its Worker; omitted to finish exporting. */
  readonly signal?: AbortSignal
}

interface ExportSuccess {
  readonly ok: true
  readonly blob: Blob
}
interface ExportFailure {
  readonly ok: false
  readonly error: string
}

/** Lossless web Poffo v1 file. Concurrent calls own separate Workers. */
export const serializePoffoDocument = async (
  document: PuppetDocument,
  options: SerializePoffoDocumentOptions = {},
): Promise<Blob> => {
  const {signal} = options
  signal?.throwIfAborted()
  if (typeof Worker === 'undefined') {
    return encodeFile(document, signal)
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./poffo-file/worker/encode.ts', import.meta.url), {
      type: 'module',
    })
    const dispose = () => {
      signal?.removeEventListener('abort', abort)
      worker.removeEventListener('message', message)
      worker.removeEventListener('error', error)
      worker.removeEventListener('messageerror', unreadable)
      worker.terminate()
    }
    const abort = () => {
      dispose()
      reject(signal?.reason)
    }
    const error = (event: ErrorEvent) => {
      dispose()
      reject(new Error('Document export Worker failed', {cause: event.error}))
    }
    const unreadable = () => {
      dispose()
      reject(new Error('Unreadable document export response'))
    }
    const message = (event: MessageEvent<unknown>) => {
      dispose()
      const {data} = event
      if (!isExportResponse(data)) {
        reject(new Error('Unreadable document export response'))
      } else if (data.ok) {
        resolve(data.blob)
      } else {
        reject(new Error('Document export failed', {cause: data.error}))
      }
    }
    signal?.addEventListener('abort', abort, {once: true})
    worker.addEventListener('message', message, {once: true})
    worker.addEventListener('error', error, {once: true})
    worker.addEventListener('messageerror', unreadable, {once: true})
    try {
      worker.postMessage(compactDocumentTextures(document))
    } catch (cause) {
      dispose()
      reject(new Error('Could not send document for export', {cause}))
    }
  })
}

const isExportResponse = (value: unknown): value is ExportSuccess | ExportFailure =>
  typeof value === 'object' &&
  value !== null &&
  'ok' in value &&
  (value.ok === true
    ? 'blob' in value && value.blob instanceof Blob
    : value.ok === false && 'error' in value && typeof value.error === 'string')
