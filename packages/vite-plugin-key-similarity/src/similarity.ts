import type {KeyComparison, KeyEntry, SimilarityDiagnostic} from './types'

interface CreateDiagnosticOptions {
  readonly left: KeyEntry
  readonly leftComparison: KeyComparison
  readonly leftVector: Float32Array
  readonly right: KeyEntry
  readonly rightComparison: KeyComparison
  readonly rightVector: Float32Array
}

export const normalizeVector = (vector: Float32Array): Float32Array => {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (magnitude === 0) {
    return vector
  }
  return Float32Array.from(vector, (value) => value / magnitude)
}

export const cosineSimilarity = (left: Float32Array, right: Float32Array): number => {
  if (left.length !== right.length) {
    throw new Error('Embedding dimensions do not match.')
  }
  return left.reduce((sum, value, index) => sum + value * right[index]!, 0)
}

export const createDiagnostic = (options: CreateDiagnosticOptions): SimilarityDiagnostic => ({
  left: options.left,
  leftComparison: options.leftComparison,
  right: options.right,
  rightComparison: options.rightComparison,
  semanticScore: cosineSimilarity(options.leftVector, options.rightVector),
  semanticThreshold: Math.max(
    options.leftComparison.semanticThreshold,
    options.rightComparison.semanticThreshold,
  ),
})
