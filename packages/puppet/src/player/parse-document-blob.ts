import {parseDocument, type ParseDocumentResult} from './parse-document'
import {parseDocumentStream} from './parse-document-stream'

export interface ParseDocumentBlobOptions {
  /** File content; large files are streamed without constructing their full JSON text. */
  readonly source: Blob
  /** Cancels validation. A small native Blob.text read may finish after the wait is cancelled. */
  readonly signal?: AbortSignal
}

const TEXT_LIMIT = 16_777_216

const readText = (source: Blob, signal?: AbortSignal): Promise<string> => {
  if (signal === undefined) {
    return source.text()
  }
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', abort)
    const abort = () => {
      cleanup()
      reject(signal.reason)
    }
    signal.addEventListener('abort', abort, {once: true})
    try {
      source.text().then(
        (text) => {
          cleanup()
          resolve(text)
        },
        (error) => {
          cleanup()
          reject(error)
        },
      )
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}

export const parseDocumentBlob = async (
  options: ParseDocumentBlobOptions,
): Promise<ParseDocumentResult> => {
  const {source, signal} = options
  signal?.throwIfAborted()
  if (source.size < TEXT_LIMIT) {
    const text = await readText(source, signal)
    signal?.throwIfAborted()
    return parseDocument(text.replace(/^\uFEFF/u, ''))
  }
  return parseDocumentStream({signal, source: source.stream()})
}
