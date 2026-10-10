/** Copies byte views in order into a new buffer, including for empty or single inputs. */
export const concatBytes = (chunks: ReadonlyArray<Uint8Array>): Uint8Array<ArrayBuffer> => {
  const totalBytes = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
  const result = new Uint8Array(totalBytes)
  let offset = 0

  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }

  return result
}
