/* eslint-disable no-magic-numbers -- Fixed offsets in Pixi's packed vertices and triangle topology. */
export const BATCH_VERTEX_WORDS = 6
export const GRADIENT_VERTEX_WORDS = 4

export type ProvokingVertex = 'first' | 'last'

interface PackGradientVerticesOptions {
  /** Borrowed default batcher vertices with six words per vertex. */
  readonly source: Float32Array
  /** Borrowed triangle topology, in paint order. */
  readonly indices: Uint16Array | Uint32Array
  /** Owned six-word vertices, with capacity for one extra vertex per triangle. */
  readonly target: Float32Array
  /** Per-vertex gradients; only the added provoking vertices are sampled. */
  readonly gradients: Float32Array
  /** Rebuild topology when supplied; omitted, retain the previous indices. */
  readonly targetIndices?: Uint32Array
  /** Borrowed packed-attribute offsets matching indices; omitted, derive them while packing. */
  readonly vertexOffsets?: Uint32Array
  /** Flat attribute convention; omitted, use WebGL's last vertex. */
  readonly provoking?: ProvokingVertex
}

const copyPackedVertex = (
  sourceWords: Uint32Array,
  targetWords: Uint32Array,
  input: number,
  output: number,
) => {
  targetWords[output] = sourceWords[input]!
  targetWords[output + 1] = sourceWords[input + 1]!
  targetWords[output + 2] = sourceWords[input + 2]!
  targetWords[output + 3] = sourceWords[input + 3]!
  targetWords[output + 4] = sourceWords[input + 4]!
  targetWords[output + 5] = sourceWords[input + 5]!
}

/**
 * Keeps shared vertices, adding one provoking vertex per triangle for its affine UV Jacobian.
 * The caller owns reusable output capacity. Packed color and texture IDs retain their bits.
 * Degenerate triangles receive zero gradients; they cover no fragments.
 */
export const packGradientVertices = (options: PackGradientVerticesOptions): void => {
  const {source, indices, target, targetIndices, gradients, vertexOffsets} = options
  const provoking = options.provoking === 'first' ? 0 : 2
  const vertexCount = source.length / BATCH_VERTEX_WORDS
  const sourceWords = new Uint32Array(source.buffer, source.byteOffset, source.length)
  const targetWords = new Uint32Array(target.buffer, target.byteOffset, target.length)
  targetWords.set(sourceWords)
  let output = source.length
  let gradient = vertexCount * GRADIENT_VERTEX_WORDS
  for (let triangle = 0; triangle + 2 < indices.length; triangle += 3) {
    const first =
      vertexOffsets === undefined
        ? indices[triangle]! * BATCH_VERTEX_WORDS
        : vertexOffsets[triangle]!
    const second =
      vertexOffsets === undefined
        ? indices[triangle + 1]! * BATCH_VERTEX_WORDS
        : vertexOffsets[triangle + 1]!
    const third =
      vertexOffsets === undefined
        ? indices[triangle + 2]! * BATCH_VERTEX_WORDS
        : vertexOffsets[triangle + 2]!
    const horizontal = source[second]! - source[first]!
    const vertical = source[second + 1]! - source[first + 1]!
    const nextHorizontal = source[third]! - source[first]!
    const nextVertical = source[third + 1]! - source[first + 1]!
    const horizontalUv = source[second + 2]! - source[first + 2]!
    const verticalUv = source[second + 3]! - source[first + 3]!
    const nextHorizontalUv = source[third + 2]! - source[first + 2]!
    const nextVerticalUv = source[third + 3]! - source[first + 3]!
    const determinant = horizontal * nextVertical - nextHorizontal * vertical
    const inverse = determinant === 0 ? 0 : 1 / determinant
    const horizontalU =
      determinant === 0 ? 0 : (horizontalUv * nextVertical - nextHorizontalUv * vertical) * inverse
    const horizontalV =
      determinant === 0 ? 0 : (verticalUv * nextVertical - nextVerticalUv * vertical) * inverse
    const verticalU =
      determinant === 0
        ? 0
        : (nextHorizontalUv * horizontal - horizontalUv * nextHorizontal) * inverse
    const verticalV =
      determinant === 0 ? 0 : (nextVerticalUv * horizontal - verticalUv * nextHorizontal) * inverse
    const input = provoking === 0 ? first : third
    copyPackedVertex(sourceWords, targetWords, input, output)
    gradients[gradient] = horizontalU
    gradients[gradient + 1] = horizontalV
    gradients[gradient + 2] = verticalU
    gradients[gradient + 3] = verticalV
    output += BATCH_VERTEX_WORDS
    gradient += GRADIENT_VERTEX_WORDS
  }
  if (targetIndices !== undefined) {
    for (let triangle = 0; triangle + 2 < indices.length; triangle += 3) {
      targetIndices[triangle] = indices[triangle]!
      targetIndices[triangle + 1] = indices[triangle + 1]!
      targetIndices[triangle + 2] = indices[triangle + 2]!
      targetIndices[triangle + provoking] = vertexCount + triangle / 3
    }
  }
}
