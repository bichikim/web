import type {BlobReadMessages} from './types'

/** 호출자가 소유한 유휴 리더로 바이트를 읽고 완료 시 이 읽기에 사용한 리스너를 제거한다. */
export const readFileAsArrayBuffer = (
  reader: FileReader,
  blob: Blob,
  messages?: BlobReadMessages,
): Promise<ArrayBuffer> => {
  const listeners = new AbortController()
  return new Promise<ArrayBuffer>((resolve, reject) => {
    reader.addEventListener(
      'error',
      () =>
        reject(
          messages === undefined
            ? (reader.error ?? new Error('Failed to read blob.'))
            : new Error(messages.readFailed, {cause: reader.error}),
        ),
      {signal: listeners.signal},
    )
    reader.addEventListener(
      'abort',
      () => reject(new DOMException('Blob reading was aborted.', 'AbortError')),
      {signal: listeners.signal},
    )
    reader.addEventListener(
      'load',
      () => {
        const {result} = reader
        if (result instanceof ArrayBuffer) {
          resolve(result)
        } else {
          reject(new Error(messages?.invalidResult ?? 'Expected blob bytes as an ArrayBuffer.'))
        }
      },
      {signal: listeners.signal},
    )
    reader.readAsArrayBuffer(blob)
  }).finally(() => listeners.abort())
}
