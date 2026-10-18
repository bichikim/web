/**
 * Copies byte views in order into a new buffer, optionally using an already captured output length.
 * Extra capacity stays zero-filled; insufficient capacity throws the native RangeError.
 */
export const concatBytes = (
  chunks: ReadonlyArray<Uint8Array>,
  totalBytes = chunks.reduce((total, chunk) => total + chunk.byteLength, 0),
): Uint8Array<ArrayBuffer> => {
  const result = new Uint8Array(totalBytes)
  let offset = 0

  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }

  return result
}
