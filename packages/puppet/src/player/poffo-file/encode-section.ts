import {createBrotliStream} from '../internal/brotli-stream'
import type {PoffoCodec} from './types'

/** Compresses a section only when it reduces its byte length; consumes and releases its stream. */
export const encodeSection = async (source: Blob, signal?: AbortSignal) => {
  signal?.throwIfAborted()
  const stream = await createBrotliStream(source.stream(), 'compress')
  if (signal?.aborted === true) {
    await stream.cancel(signal.reason)
    signal.throwIfAborted()
  }
  const parts: Uint8Array<ArrayBuffer>[] = []
  await stream.pipeTo(
    new WritableStream({
      write: (chunk) => {
        parts.push(chunk)
      },
    }),
    {signal},
  )
  const compressed = new Blob(parts)
  const codec: PoffoCodec = compressed.size < source.size ? 1 : 0
  return {blob: codec === 1 ? compressed : source, codec}
}
