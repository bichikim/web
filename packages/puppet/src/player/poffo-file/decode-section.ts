import {createBrotliStream} from '../internal/brotli-stream'
import type {PoffoCodec} from './types'

interface DecodeSectionOptions {
  /** Borrowed encoded section; its stream is consumed. */
  readonly source: Blob
  /** Raw bytes (0) or Brotli (1). */
  readonly codec: PoffoCodec
  /** Exact output length from the validated file index. */
  readonly decodedLength: number
  /** Cancels streaming and releases the decoder; omitted to read the whole section. */
  readonly signal?: AbortSignal
}

/** Rejects both excess and missing decoded bytes without allocating an untrusted declared size. */
export const decodeSection = async (
  options: DecodeSectionOptions,
): Promise<Uint8Array<ArrayBuffer>> => {
  const {source, codec, decodedLength, signal} = options
  signal?.throwIfAborted()
  const stream =
    codec === 1 ? await createBrotliStream(source.stream(), 'decompress') : source.stream()
  if (signal?.aborted === true) {
    await stream.cancel(signal.reason)
    signal.throwIfAborted()
  }
  const parts: Uint8Array[] = []
  let length = 0
  await stream.pipeTo(
    new WritableStream<Uint8Array>({
      write(chunk) {
        if (chunk.length > decodedLength - length) {
          throw new SyntaxError('Poffo section exceeds its decoded length')
        }
        length += chunk.length
        parts.push(chunk)
      },
    }),
    {signal},
  )
  if (length !== decodedLength) {
    throw new SyntaxError('Truncated Poffo section')
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.length
  }
  return bytes
}
