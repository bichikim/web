import type {BlobReadMessages} from './types'

/** Reads bytes with a caller-owned idle reader and removes this read's listeners on completion. */
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
