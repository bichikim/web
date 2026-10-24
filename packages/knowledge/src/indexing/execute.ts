/* oxlint-disable no-await-in-loop -- Sequential batches preserve progress and gate stale deletion. */
import {isDeepStrictEqual} from 'node:util'
import type {
  DenseEmbeddingProvider,
  EmbeddingBatchResult,
  EmbeddingError,
  EmbeddingIdentity,
} from '../embedding/provider'
import type {PreparedKnowledgePoint} from './prepare'
import type {KnowledgeIndexError, KnowledgeIndexWriter, KnowledgeScope} from './store'

export interface IndexProgress {
  readonly embedded: number
  readonly metadata: number
  readonly unchanged: number
  readonly deleted: number
}

export interface ExecuteKnowledgeIndexOptions {
  readonly mode?: 'incremental' | 'rebuild'
  readonly points: ReadonlyArray<PreparedKnowledgePoint>
  readonly index: KnowledgeIndexWriter
  readonly embedding: DenseEmbeddingProvider
  readonly identity: EmbeddingIdentity
  readonly scope: KnowledgeScope
}

export type ExecuteKnowledgeIndexResult =
  | {readonly ok: true; readonly value: IndexProgress}
  | {
      readonly ok: false
      readonly error: EmbeddingError | KnowledgeIndexError
      readonly progress: IndexProgress
    }

const BATCH_SIZE = 16

const embedBatch = async (
  provider: DenseEmbeddingProvider,
  points: ReadonlyArray<PreparedKnowledgePoint>,
  expected: EmbeddingIdentity,
): Promise<EmbeddingBatchResult | {readonly ok: false; readonly error: KnowledgeIndexError}> => {
  const result = await provider.embed(points.map((point) => point.payload.text))
  if (!result.ok) {
    return result
  }
  const actual = result.value.identity
  if (
    actual.dimensions !== expected.dimensions ||
    actual.model !== expected.model ||
    actual.provider !== expected.provider ||
    result.value.vectors.length !== points.length
  ) {
    return {
      error: {
        code: 'index-schema-mismatch',
        detail: 'Embedding identity or batch size changed during indexing',
        retryable: false,
      },
      ok: false,
    }
  }
  return result
}

const validateScope = (
  points: ReadonlyArray<PreparedKnowledgePoint>,
  scope: KnowledgeScope,
): KnowledgeIndexError | undefined => {
  const ids = new Set<string>()
  for (const point of points) {
    if (
      point.payload.repoId !== scope.repoId ||
      point.payload.workspaceId !== scope.workspaceId ||
      ids.has(point.pointId)
    ) {
      return {
        code: 'index-schema-mismatch',
        detail: 'Duplicate point or point outside selected scope',
        retryable: false,
      }
    }
    ids.add(point.pointId)
  }
  return undefined
}

/** Reconciles a complete scope snapshot; stale deletion runs only after all writes succeed. */
export const executeKnowledgeIndex = async (
  options: ExecuteKnowledgeIndexOptions,
): Promise<ExecuteKnowledgeIndexResult> => {
  const progress = {deleted: 0, embedded: 0, metadata: 0, unchanged: 0}
  const failure = (error: EmbeddingError | KnowledgeIndexError): ExecuteKnowledgeIndexResult => ({
    error,
    ok: false,
    progress: {...progress},
  })
  const scopeError = validateScope(options.points, options.scope)
  if (scopeError !== undefined) {
    return failure(scopeError)
  }
  const ids = new Set(options.points.map((point) => point.pointId))
  const state = await options.index.readState(options.scope)
  if (!state.ok) {
    return failure(state.error)
  }
  const indexed = new Map(state.value.map((point) => [point.pointId, point.payload]))
  const changed: PreparedKnowledgePoint[] = []
  for (const point of options.points) {
    const previous = indexed.get(point.pointId)
    if (options.mode !== 'rebuild' && previous?.contentHash === point.payload.contentHash) {
      // Payload changes (rename, line movement, commit) do not require a new dense embedding.
      if (isDeepStrictEqual(previous, point.payload)) {
        progress.unchanged += 1
      } else {
        const result = await options.index.replacePayload(point, options.scope)
        if (!result.ok) {
          return failure(result.error)
        }
        progress.metadata += 1
      }
    } else {
      changed.push(point)
    }
  }
  for (let offset = 0; offset < changed.length; offset += BATCH_SIZE) {
    const batch = changed.slice(offset, offset + BATCH_SIZE)
    const result = await embedBatch(options.embedding, batch, options.identity)
    if (!result.ok) {
      return failure(result.error)
    }
    const written = await options.index.upsert(
      batch.map((point, index) => ({...point, denseVector: result.value.vectors[index]})),
    )
    if (!written.ok) {
      return failure(written.error)
    }
    progress.embedded += batch.length
  }
  const stale = state.value.filter((point) => !ids.has(point.pointId)).map((point) => point.pointId)
  for (let offset = 0; offset < stale.length; offset += BATCH_SIZE) {
    const batch = stale.slice(offset, offset + BATCH_SIZE)
    const result = await options.index.deleteScoped(batch, options.scope)
    if (!result.ok) {
      return failure(result.error)
    }
    progress.deleted += batch.length
  }
  return {ok: true, value: progress}
}
