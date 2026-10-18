import {readFileAsArrayBuffer} from './read-file-as-array-buffer'
import type {BlobReadMessages} from './types'

/** Blob의 기본 읽기 메서드를 사용하고, 지원하지 않으면 FileReader로 읽는다. */
export const readBlobAsArrayBuffer = async (
  blob: Blob,
  messages?: BlobReadMessages,
): Promise<ArrayBuffer> => {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer()
  }
  return readFileAsArrayBuffer(new FileReader(), blob, messages)
}
