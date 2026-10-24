import {getMp3AudioOffset} from './get-mp3-audio-offset'

const HEADER_BYTES = 10

export const validateMp3Header = (
  stream: ReadableStream<Uint8Array>,
  sizeBytes: number,
): ReadableStream<Uint8Array> => {
  const header = new Uint8Array(HEADER_BYTES)
  let headerSize = 0
  const validate = (): void => {
    if (getMp3AudioOffset(header.subarray(0, headerSize)) > sizeBytes) {
      throw new TypeError('invalid_mp3_id3')
    }
  }
  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      flush: validate,
      transform(chunk, controller) {
        if (headerSize < HEADER_BYTES) {
          const part = chunk.subarray(0, HEADER_BYTES - headerSize)
          header.set(part, headerSize)
          headerSize += part.byteLength
          if (headerSize === HEADER_BYTES) {
            validate()
          }
        }
        controller.enqueue(chunk)
      },
    }),
  )
}
