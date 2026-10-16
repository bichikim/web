import {type CodeDocument, sourceChunkSchema} from '../shared/contracts'
import {SOURCE_CHUNK_LENGTH} from '../shared/reading-limits'
import {errorMessage} from './error-message'
import type {ViewerPort, ViewerRequestOptions} from './types'

interface LoadSourceOptions {
  readonly document: CodeDocument
  readonly session: string
  readonly port: Pick<ViewerPort, 'call'>
  readonly request?: ViewerRequestOptions
  readonly current?: () => boolean
}
const CONCURRENCY = 4
interface LoadedSource {
  readonly key: string
  readonly value: string
}
// Reuse the latest verified source without retaining document histories or disposed ports.
const loadedSources = new WeakMap<Pick<ViewerPort, 'call'>, LoadedSource>()

/** Loads revision-bound source chunks with bounded concurrency and preserves UTF-16 contents. */
export const loadDocumentSource = async ({
  document,
  session,
  port,
  request,
  current,
}: LoadSourceOptions): Promise<string> => {
  const length = document.sourceLength
  if (length === undefined) {
    throw new Error('Missing source length')
  }
  request?.signal?.throwIfAborted()
  if (current?.() === false) {
    throw new DOMException('Document loading was replaced', 'AbortError')
  }
  const key = JSON.stringify([session, document.location.path, document.revision, length])
  const cached = loadedSources.get(port)
  if (cached?.key === key) {
    return cached.value
  }
  const parts: string[] = []
  const read = async (offset: number): Promise<string> => {
    const input = {offset, path: document.location.path, revision: document.revision, session}
    const result =
      request === undefined
        ? await port.call('code.source', input)
        : await port.call('code.source', input, request)
    if (result.isError) {
      throw new Error(errorMessage(result.structuredContent), {cause: result.structuredContent})
    }
    const chunk = sourceChunkSchema.parse(result.structuredContent)
    if (
      chunk.next !== Math.min(length, offset + SOURCE_CHUNK_LENGTH) ||
      chunk.next !== offset + chunk.data.length
    ) {
      throw new Error(errorMessage({code: 'read-failed'}))
    }
    return chunk.data
  }
  for (let offset = 0; offset < length; offset += SOURCE_CHUNK_LENGTH * CONCURRENCY) {
    request?.signal?.throwIfAborted()
    if (current?.() === false) {
      throw new DOMException('Document loading was replaced', 'AbortError')
    }
    const offsets = Array.from(
      {length: Math.min(CONCURRENCY, Math.ceil((length - offset) / SOURCE_CHUNK_LENGTH))},
      (_, index) => offset + index * SOURCE_CHUNK_LENGTH,
    )
    // oxlint-disable-next-line no-await-in-loop -- Drain each bounded batch before replacement, failure or the next reads.
    const batch = await Promise.allSettled(offsets.map(read))
    request?.signal?.throwIfAborted()
    const failure = batch.find((result) => result.status === 'rejected')
    if (failure?.status === 'rejected') {
      throw failure.reason
    }
    parts.push(...batch.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])))
  }
  const value = parts.join('')
  if (current?.() === false) {
    throw new DOMException('Document loading was replaced', 'AbortError')
  }
  loadedSources.set(port, {key, value})
  return value
}
