import type {KnowledgeHashRelation} from '../domain/content-hash'
import {
  getKnowledge,
  getKnowledgeByIdentity,
  type GetKnowledgeByIdentityOptions,
  type GetKnowledgeOptions,
  type KnowledgeIdentityReadError,
  type KnowledgeReadError,
  type ReadKnowledgeOptions,
} from './read'
import type {KnowledgeIndexError, StoredKnowledgePoint} from './store'

export interface GetRelatedKnowledgeOptions extends GetKnowledgeOptions {
  readonly limit: number
}
export interface RelatedKnowledge {
  readonly points: ReadonlyArray<StoredKnowledgePoint>
  readonly missing: ReadonlyArray<KnowledgeHashRelation>
  readonly truncated: boolean
}
export interface InvalidRelatedLimitError {
  readonly code: 'invalid-related-limit'
}
export type GetRelatedKnowledgeResult =
  | {readonly ok: true; readonly value: RelatedKnowledge}
  | {readonly ok: false; readonly error: KnowledgeReadError | InvalidRelatedLimitError}

const MAX_LIMIT = 100

export interface GetRelatedKnowledgeByIdentityOptions extends GetKnowledgeByIdentityOptions {
  /** Maximum direct targets and returned units, from 1 to 100. */
  readonly limit: number
}
export type GetRelatedKnowledgeByIdentityResult =
  | {readonly ok: true; readonly value: RelatedKnowledge}
  | {readonly ok: false; readonly error: KnowledgeIdentityReadError | InvalidRelatedLimitError}

/** Follows existing stored relations from a separately selected document or unit. */
export const getRelatedKnowledgeByIdentity = async (
  options: GetRelatedKnowledgeByIdentityOptions,
): Promise<GetRelatedKnowledgeByIdentityResult> => {
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > MAX_LIMIT) {
    return {error: {code: 'invalid-related-limit'}, ok: false}
  }
  const source = await getKnowledgeByIdentity(options)
  return source.ok ? readTargets(options, source.value) : source
}

/** Resolves at most limit distinct outgoing targets for one hop; reports missing targets and bounded results. */
export const getRelatedKnowledge = async (
  options: GetRelatedKnowledgeOptions,
): Promise<GetRelatedKnowledgeResult> => {
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > MAX_LIMIT) {
    return {error: {code: 'invalid-related-limit'}, ok: false}
  }
  const source = await getKnowledge(options)
  if (!source.ok) {
    return source
  }
  return readTargets(options, source.value)
}

interface ReadTargetsOptions extends ReadKnowledgeOptions {
  /** Maximum distinct outgoing targets to read and units to return. */
  readonly limit: number
}
type ReadTargetsResult =
  | {readonly ok: true; readonly value: RelatedKnowledge}
  | {readonly ok: false; readonly error: KnowledgeIndexError}

const readTargets = async (
  options: ReadTargetsOptions,
  source: ReadonlyArray<StoredKnowledgePoint>,
): Promise<ReadTargetsResult> => {
  const targets = new Map<string, KnowledgeHashRelation>()
  for (const point of source) {
    for (const relation of point.payload.relations) {
      targets.set(JSON.stringify([relation.targetDocId, relation.targetUnitId]), relation)
    }
  }
  const selected = [...targets.values()].slice(0, options.limit)
  const points = new Map<string, StoredKnowledgePoint>()
  const missing: KnowledgeHashRelation[] = []
  for (const relation of selected) {
    // Bound concurrent work against the local store while preserving deterministic target order.
    // oxlint-disable-next-line no-await-in-loop
    const result = await options.index.readState({
      ...options.scope,
      docId: relation.targetDocId,
      ...(relation.targetUnitId === undefined ? {} : {unitId: relation.targetUnitId}),
    })
    if (!result.ok) {
      return result
    }
    if (result.value.length === 0) {
      missing.push(relation)
    }
    for (const point of result.value) {
      points.set(point.pointId, point)
    }
  }
  return {
    ok: true,
    value: {
      missing,
      points: [...points.values()].slice(0, options.limit),
      truncated: targets.size > selected.length || points.size > options.limit,
    },
  }
}
