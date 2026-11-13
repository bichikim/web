import {
  isPreparedPuppetDocument,
  markPreparedPuppetDocument,
  type PreparedPuppetDocument,
} from './internal/prepared-document'
import type {PreparePuppetDocumentRequest} from './internal/prepare-puppet-document-request'
import {expandDocumentTextureAssets} from './texture-assets'
import type {PuppetDocument} from './document'
import type {PreparePuppetDocumentResponse} from './internal/prepare-puppet-document-response'
import {parseDocumentBlob} from './parse-document-blob'
import {
  parseDocument,
  type ParseDocumentFailure,
  type ParseDocumentResult,
  parseDocumentValue,
} from './parse-document'

export type {PreparedPuppetDocument} from './internal/prepared-document'

export interface PreparePuppetDocumentSourceOptions {
  /** Cancels validation and releases its Worker; omitted to finish validation. */
  readonly signal?: AbortSignal
  /** JSON text or a file read in the validation Worker without expanding large files to text. */
  readonly source: string | Blob
}

export interface PreparePuppetDocumentValueOptions {
  /** Already decoded document value to validate. */
  readonly document: unknown
  /** Cancels validation and releases its Worker; omitted to finish validation. */
  readonly signal?: AbortSignal
}

export type PreparePuppetDocumentOptions =
  | PreparePuppetDocumentSourceOptions
  | PreparePuppetDocumentValueOptions

export interface PreparePuppetDocumentSuccess {
  readonly document: PreparedPuppetDocument
  readonly ok: true
}

export type PreparePuppetDocumentResult = ParseDocumentFailure | PreparePuppetDocumentSuccess

const prepareWithoutWorker = (
  options: PreparePuppetDocumentOptions,
): PreparePuppetDocumentResult | Promise<PreparePuppetDocumentResult> => {
  if (!('source' in options)) {
    return parseDocumentValue(options.document)
  }
  return typeof options.source === 'string'
    ? parseDocument(options.source)
    : parseDocumentBlob({signal: options.signal, source: options.source})
}

const prepareRequest = (options: PreparePuppetDocumentOptions): PreparePuppetDocumentRequest =>
  'source' in options
    ? typeof options.source === 'string'
      ? {source: options.source, type: 'source'}
      : {source: options.source, type: 'blob'}
    : {document: options.document, type: 'document'}

export const preparePuppetDocument = (
  options: PreparePuppetDocumentOptions,
): Promise<PreparePuppetDocumentResult> => {
  const {signal} = options

  if (signal?.aborted === true) {
    return Promise.reject(signal.reason)
  }

  if ('document' in options && isPreparedPuppetDocument(options.document)) {
    return Promise.resolve({document: options.document, ok: true})
  }

  if (typeof Worker === 'undefined') {
    return Promise.resolve(prepareWithoutWorker(options))
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./internal/prepare-puppet-document-worker.ts', import.meta.url),
      {type: 'module'},
    )

    const dispose = () => {
      signal?.removeEventListener('abort', handleAbort)
      worker.removeEventListener('error', handleError)
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('messageerror', handleMessageError)
      worker.terminate()
    }
    const handleAbort = () => {
      dispose()
      reject(signal?.reason)
    }
    const handleError = (event: ErrorEvent) => {
      dispose()
      reject(new Error('Puppet document validation Worker failed', {cause: event.error}))
    }
    const handleMessage = (event: MessageEvent<PreparePuppetDocumentResponse>) => {
      dispose()
      const result = event.data
      if ('type' in result) {
        reject(
          new Error('Puppet document validation Worker could not read the source', {
            cause: result.error,
          }),
        )
        return
      }

      resolve(
        result.ok
          ? {
              document: markPreparedPuppetDocument(
                expandDocumentTextureAssets(result.document) as PuppetDocument,
              ),
              ok: true,
            }
          : result,
      )
    }
    const handleMessageError = (event: MessageEvent<unknown>) => {
      dispose()
      reject(
        new Error('Puppet document validation Worker returned an unreadable response', {
          cause: event.data,
        }),
      )
    }

    signal?.addEventListener('abort', handleAbort, {once: true})
    worker.addEventListener('error', handleError, {once: true})
    worker.addEventListener('message', handleMessage, {once: true})
    worker.addEventListener('messageerror', handleMessageError, {once: true})

    try {
      worker.postMessage(prepareRequest(options))
    } catch (error) {
      dispose()
      reject(new Error('Puppet document validation Worker request failed', {cause: error}))
    }
  })
}
