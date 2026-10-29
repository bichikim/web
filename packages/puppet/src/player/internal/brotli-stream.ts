/** Streams Brotli with bounded output buffers and releases WASM state on every terminal path. */
export const createBrotliStream = async (
  source: ReadableStream<Uint8Array>,
  mode: 'compress' | 'decompress',
): Promise<ReadableStream<Uint8Array<ArrayBuffer>>> => {
  const {default: loading} = await import('brotli-wasm')
  const brotli = await loading
  const quality = 9
  const outputSize = 65_536
  const codec =
    mode === 'compress' ? new brotli.CompressStream(quality) : new brotli.DecompressStream()
  const reader = source.getReader()
  let input: Uint8Array = new Uint8Array()
  let ended = false
  let draining = false
  let finished = false
  let disposed = false
  const dispose = async (reason?: unknown) => {
    if (!disposed) {
      disposed = true
      codec.free()
      try {
        await reader.cancel(reason)
      } finally {
        reader.releaseLock()
      }
    }
  }
  const process = () => {
    try {
      const result =
        mode === 'compress'
          ? (codec as InstanceType<typeof brotli.CompressStream>).compress(
              ended ? undefined : input,
              outputSize,
            )
          : (codec as InstanceType<typeof brotli.DecompressStream>).decompress(input, outputSize)
      try {
        return {
          code: result.code,
          consumed: result.input_offset,
          output: new Uint8Array(result.buf),
        }
      } finally {
        result.free()
      }
    } catch (cause) {
      throw new SyntaxError('Invalid Brotli data', {cause})
    }
  }
  return new ReadableStream({
    cancel: dispose,
    async pull(controller) {
      try {
        // Cancellation changes disposed while the reader is awaiting the next chunk.
        // eslint-disable-next-line no-unmodified-loop-condition
        while (!disposed) {
          if (input.length === 0 && !ended && !draining) {
            // Stream order and bounded memory require consuming one chunk at a time.
            // eslint-disable-next-line no-await-in-loop
            const next = await reader.read()
            if (disposed) {
              return
            }
            ended = next.done
            input = next.value ?? new Uint8Array()
          }
          if (finished) {
            if (input.length !== 0 || !ended) {
              throw new SyntaxError('Trailing Brotli data')
            }
            // Release only after the terminal chunk has been validated.
            // eslint-disable-next-line no-await-in-loop
            await dispose()
            controller.close()
            return
          }
          if (ended && mode === 'decompress' && !draining) {
            throw new SyntaxError('Truncated Brotli data')
          }
          const {output, consumed, code} = process()
          input = input.subarray(consumed)
          finished = code === brotli.BrotliStreamResultCode.ResultSuccess
          draining = code === brotli.BrotliStreamResultCode.NeedsMoreOutput
          if (!finished && !draining && (ended || input.length > 0)) {
            throw new SyntaxError('Incomplete Brotli stream')
          }
          if (output.length > 0) {
            controller.enqueue(output)
            return
          }
        }
      } catch (error) {
        await dispose(error)
        controller.error(error)
      }
    },
  })
}
