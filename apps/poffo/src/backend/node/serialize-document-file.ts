import {Duplex} from 'node:stream'
import {constants, createBrotliCompress} from 'node:zlib'
import {type PuppetDocument, serializePoffoDocument} from '@winter-love/puppet/player'
import {type DocumentFileFormat, serializeDocumentFile} from '../serialize-document-file'

const compress = async (source: ReadableStream<Uint8Array<ArrayBuffer>>) => {
  const QUALITY = 9
  const codec = createBrotliCompress({params: {[constants.BROTLI_PARAM_QUALITY]: QUALITY}})
  // Node and lib.dom describe the same Web Streams runtime with different BYOB buffer types.
  const streams = Duplex.toWeb(codec) as unknown as ReadableWritablePair<
    Uint8Array<ArrayBuffer>,
    Uint8Array<ArrayBuffer>
  >
  return source.pipeThrough(streams)
}

/** Keeps native compression off the host event loop while retaining the common Poffo container. */
export const serializeNodeDocumentFile = (
  document: PuppetDocument,
  format: DocumentFileFormat,
  signal?: AbortSignal,
): Promise<Blob> =>
  format === 'poffo'
    ? serializePoffoDocument(document, {compress, signal})
    : serializeDocumentFile(document, format, signal)
