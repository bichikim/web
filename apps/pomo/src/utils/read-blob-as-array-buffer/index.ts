import {readFileAsArrayBuffer} from './read-file-as-array-buffer'
import type {BlobReadMessages} from './types'

export * from './read-file-as-array-buffer'
export * from './types'

/** Reads Blob bytes using its native reader or the FileReader fallback. */
export const readBlobAsArrayBuffer = async (
  blob: Blob,
  messages?: BlobReadMessages,
): Promise<ArrayBuffer> => {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer()
  }
  return readFileAsArrayBuffer(new FileReader(), blob, messages)
}
