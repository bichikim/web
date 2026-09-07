import {
  isPreparedPuppetDocument,
  markPreparedPuppetDocument,
  type PreparedPuppetDocument,
} from './internal/prepared-document'
import type {PreparePuppetDocumentRequest} from './internal/prepare-puppet-document-request'
import {
  parseDocument,
  type ParseDocumentFailure,
  type ParseDocumentResult,
  parseDocumentValue,
} from './parse-document'

export type {PreparedPuppetDocument} from './internal/prepared-document'

export interface PreparePuppetDocumentSourceOptions {
  readonly signal?: AbortSignal
  readonly source: string
}

export interface PreparePuppetDocumentValueOptions {
  readonly document: unknown
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

const prepareSynchronously = (options: PreparePuppetDocumentOptions): PreparePuppetDocumentResult =>
  'source' in options ? parseDocument(options.source) : parseDocumentValue(options.document)

const prepareRequest = (options: PreparePuppetDocumentOptions): PreparePuppetDocumentRequest =>
  'source' in options
    ? {source: options.source, type: 'source'}
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
    return Promise.resolve(prepareSynchronously(options))
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
    const handleMessage = (event: MessageEvent<ParseDocumentResult>) => {
      dispose()
      const result = event.data

      resolve(
        result.ok ? {document: markPreparedPuppetDocument(result.document), ok: true} : result,
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
