export interface Float32Source {
  readonly chunks: ReadonlyArray<Float32Array>
}

/** Copies a nonempty collection of views into an owned buffer with nonnegative integer gaps; reads chunks for sample sizing, gap sizing, then copying. */
export const concatFloat32 = (
  source: Float32Source,
  gapLength: number,
): Float32Array<ArrayBuffer> => {
  const totalLength =
    source.chunks.reduce((total, chunk) => total + chunk.length, 0) +
    (source.chunks.length - 1) * gapLength
  const samples = new Float32Array(totalLength)
  let offset = 0

  for (const chunk of source.chunks) {
    samples.set(chunk, offset)
    offset += chunk.length + gapLength
  }

  return samples
}
