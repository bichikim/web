import type {KnowledgeStatus} from '../domain/content-hash'
import type {
  KnowledgeIndexError,
  KnowledgeIndexStateResult,
  KnowledgeIndexWriter,
  KnowledgeScope,
} from './store'

export interface ReadKnowledgeOptions {
  readonly index: Pick<KnowledgeIndexWriter, 'readState'>
  readonly scope: KnowledgeScope
}

export interface GetKnowledgeOptions extends ReadKnowledgeOptions {
  readonly logicalId: string
}

export interface InvalidLogicalIdError {
  readonly code: 'invalid-logical-id'
}

export interface KnowledgeNotFoundError {
  readonly code: 'knowledge-not-found'
  readonly logicalId: string
}

export type KnowledgeReadError =
  | KnowledgeIndexError
  | InvalidLogicalIdError
  | KnowledgeNotFoundError

export type GetKnowledgeResult =
  | KnowledgeIndexStateResult
  | {readonly ok: false; readonly error: InvalidLogicalIdError | KnowledgeNotFoundError}

/** Reads a stored document or one unit, ordered by source location, without embedding. */
export const getKnowledge = async (options: GetKnowledgeOptions): Promise<GetKnowledgeResult> => {
  const [docId, unitId, extra] = options.logicalId.split('#')
  if (docId.trim() === '' || unitId === '' || extra !== undefined) {
    return {error: {code: 'invalid-logical-id'}, ok: false}
  }
  const result = await options.index.readState({
    ...options.scope,
    docId,
    ...(unitId === undefined ? {} : {unitId}),
  })
  if (!result.ok) {
    return result
  }
  if (result.value.length === 0) {
    return {error: {code: 'knowledge-not-found', logicalId: options.logicalId}, ok: false}
  }
  return {
    ok: true,
    value: result.value.toSorted(
      (left, right) =>
        left.payload.path.localeCompare(right.payload.path) ||
        (left.payload.startLine ?? 1) - (right.payload.startLine ?? 1) ||
        left.payload.unitId.localeCompare(right.payload.unitId),
    ),
  }
}

export interface KnowledgeIndexStatus {
  readonly documents: number
  readonly units: number
  readonly statuses: Readonly<Record<KnowledgeStatus, number>>
}

export type GetKnowledgeStatusResult =
  | {readonly ok: true; readonly value: KnowledgeIndexStatus}
  | {readonly ok: false; readonly error: KnowledgeIndexError}

/** Counts stored documents and units in one scope; does not compare working files. */
export const getKnowledgeStatus = async (
  options: ReadKnowledgeOptions,
): Promise<GetKnowledgeStatusResult> => {
  const result = await options.index.readState(options.scope)
  if (!result.ok) {
    return result
  }
  const documents = new Set<string>()
  const statuses = {active: 0, conflicting: 0, deprecated: 0, superseded: 0}
  for (const point of result.value) {
    documents.add(point.payload.docId)
    statuses[point.payload.status] += 1
  }
  return {ok: true, value: {documents: documents.size, statuses, units: result.value.length}}
}
