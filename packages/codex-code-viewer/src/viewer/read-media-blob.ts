import {type CodeDocument, mediaChunkSchema} from '../shared/contracts'
import type {ViewerPort} from './types'
import type {MediaLoad} from './create-media-cache'
import {callViewerTool} from './call-viewer-tool'

interface MediaBlobOptions extends MediaLoad {
  readonly document: CodeDocument
  readonly port: ViewerPort
  readonly session: string
}

/** Reads revision-checked chunks into a Blob, stopping after cancellation. */
export const readMediaBlob = async (options: MediaBlobOptions): Promise<Blob> => {
  const PERCENT = 100
  const {media} = options.document
  if (media === undefined) {
    throw new Error('미디어 파일이 아닙니다.')
  }
  const parts: Uint8Array<ArrayBuffer>[] = []
  let offset = 0
  while (offset < media.size) {
    options.signal.throwIfAborted()
    // oxlint-disable-next-line no-await-in-loop -- Each response determines the next chunk offset.
    const chunk = await callViewerTool({
      input: {
        offset,
        path: options.document.location.path,
        revision: options.document.revision,
        session: options.session,
      },
      name: 'code.media',
      port: options.port,
      schema: mediaChunkSchema,
    })
    options.signal.throwIfAborted()
    const bytes = Uint8Array.from(atob(chunk.data), (character) => character.charCodeAt(0))
    if (chunk.next <= offset || chunk.next > media.size || chunk.next - offset !== bytes.length) {
      throw new Error('미디어 데이터를 읽지 못했습니다.')
    }
    parts.push(bytes)
    offset = chunk.next
    options.onProgress(Math.round((offset / media.size) * PERCENT))
  }
  options.signal.throwIfAborted()
  options.onProgress(PERCENT)
  return new Blob(parts, {type: media.mimeType})
}
