import {withAbort} from './internal/with-abort'
import {parseDocument, type ParseDocumentResult, parseDocumentValue} from './parse-document'
import {decodeFile} from './poffo-file/decode-file'
import {isPoffoFile, POFFO_MIME_TYPE, POFFO_SIGNATURE_BYTES} from './poffo-file/header'
import {parseDocumentStream} from './parse-document-stream'

export interface ParseDocumentBlobOptions {
  /** JSON or native .poffo file content; large JSON files are parsed as streams. */
  readonly source: Blob
  /** Cancels validation and pending waits. Native reads may finish after the wait is cancelled. */
  readonly signal?: AbortSignal
}

const TEXT_LIMIT = 16_777_216

export const parseDocumentBlob = async (
  options: ParseDocumentBlobOptions,
): Promise<ParseDocumentResult> => {
  const {source, signal} = options
  signal?.throwIfAborted()
  const name = 'name' in source && typeof source.name === 'string' ? source.name.toLowerCase() : ''
  const knownJson = source.type === 'application/json' || name.endsWith('.json')
  const native =
    source.type === POFFO_MIME_TYPE ||
    name.endsWith('.poffo') ||
    (!knownJson &&
      isPoffoFile(
        new Uint8Array(
          await withAbort(() => source.slice(0, POFFO_SIGNATURE_BYTES).arrayBuffer(), signal),
        ),
      ))
  signal?.throwIfAborted()
  if (native) {
    try {
      return parseDocumentValue(await decodeFile(source, signal))
    } catch (error) {
      signal?.throwIfAborted()
      if (error instanceof SyntaxError) {
        return {error: {code: 'invalid-document'}, ok: false}
      }
      throw error
    }
  }
  if (source.size < TEXT_LIMIT) {
    const text = await withAbort(() => source.text(), signal)
    signal?.throwIfAborted()
    return parseDocument(text.replace(/^\uFEFF/u, ''))
  }
  return parseDocumentStream({signal, source: source.stream()})
}
