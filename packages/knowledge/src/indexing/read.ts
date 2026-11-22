import type {KnowledgeStatus} from '../domain/content-hash'
import type {
  KnowledgeIndexError,
  KnowledgeIndexStateResult,
  KnowledgeIndexWriter,
  KnowledgeScope,
  StoredKnowledgePoint,
} from './store'

export interface ReadKnowledgeOptions {
  /** Caller-owned index reader; retrieval neither mutates nor closes it. */
  readonly index: Pick<KnowledgeIndexWriter, 'readState'>
  /** Repository and workspace to constrain every read. */
  readonly scope: KnowledgeScope
}

export interface GetKnowledgeOptions extends ReadKnowledgeOptions {
  /** Legacy document ID or docId#unitId, with its existing delimiter interpretation. */
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

export interface KnowledgeIdentity {
  /** Stored document ID, passed verbatim without delimiter parsing or decoding. */
  readonly docId: string
  /** Stored unit ID; omission selects every unit of the document. */
  readonly unitId?: string
}

export interface GetKnowledgeByIdentityOptions extends ReadKnowledgeOptions {
  /** Nonblank literal document and optional unit fields to retrieve. */
  readonly identity: KnowledgeIdentity
}

export interface InvalidKnowledgeIdentityError {
  readonly code: 'invalid-knowledge-identity'
}

export interface KnowledgeIdentityNotFoundError {
  readonly code: 'knowledge-not-found'
  readonly selector: KnowledgeIdentity
}

export type KnowledgeIdentityReadError =
  | KnowledgeIndexError
  | InvalidKnowledgeIdentityError
  | KnowledgeIdentityNotFoundError

export type GetKnowledgeByIdentityResult =
  | KnowledgeIndexStateResult
  | {
      readonly ok: false
      readonly error: InvalidKnowledgeIdentityError | KnowledgeIdentityNotFoundError
    }

const orderPoints = (
  points: ReadonlyArray<StoredKnowledgePoint>,
): ReadonlyArray<StoredKnowledgePoint> =>
  points.toSorted(
    (left, right) =>
      left.payload.path.localeCompare(right.payload.path) ||
      (left.payload.startLine ?? 1) - (right.payload.startLine ?? 1) ||
      left.payload.unitId.localeCompare(right.payload.unitId),
  )

/** Reads separate identity fields verbatim, including literal # and % characters. */
export const getKnowledgeByIdentity = async (
  options: GetKnowledgeByIdentityOptions,
): Promise<GetKnowledgeByIdentityResult> => {
  const {docId, unitId} = options.identity
  if (docId.trim() === '' || unitId?.trim() === '') {
    return {error: {code: 'invalid-knowledge-identity'}, ok: false}
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
    return {error: {code: 'knowledge-not-found', selector: options.identity}, ok: false}
  }
  return {ok: true, value: orderPoints(result.value)}
}

/** Reads a stored document or one unit, ordered by source location, without embedding. */
export const getKnowledge = async (options: GetKnowledgeOptions): Promise<GetKnowledgeResult> => {
  const [docId, unitId, extra] = options.logicalId.split('#')
  if (docId.trim() === '' || unitId?.trim() === '' || extra !== undefined) {
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
  return {ok: true, value: orderPoints(result.value)}
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
