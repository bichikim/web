import type {
  KnowledgeHashRelation,
  KnowledgeStatus,
  KnowledgeUnitType,
} from '../domain/content-hash'
import type {EmbeddingIdentity} from '../embedding/provider'

export interface KnowledgePointPayload {
  readonly commit?: string
  readonly contentHash: string
  readonly docId: string
  readonly endLine?: number
  readonly language?: string
  readonly path: string
  readonly relations: ReadonlyArray<KnowledgeHashRelation>
  readonly repoId: string
  readonly startLine?: number
  readonly status: KnowledgeStatus
  readonly tags: ReadonlyArray<string>
  readonly text: string
  readonly title: string
  readonly type: KnowledgeUnitType
  readonly unitId: string
  readonly workspaceId: string
}

export interface UpsertKnowledgePoint {
  readonly denseVector: ReadonlyArray<number>
  readonly payload: KnowledgePointPayload
  readonly pointId: string
}

export interface EnsureKnowledgeIndexSchemaOptions {
  readonly createIfMissing?: boolean
  readonly embedding: EmbeddingIdentity
  readonly schemaVersion: number
}

export interface KnowledgeScope {
  readonly repoId: string
  readonly workspaceId: string
}

export interface StoredKnowledgePoint {
  readonly pointId: string
  readonly payload: KnowledgePointPayload
}

export interface ReadKnowledgeStateOptions extends KnowledgeScope {
  readonly docId?: string
  readonly unitId?: string
}

export type KnowledgeIndexStateResult =
  | {readonly ok: true; readonly value: ReadonlyArray<StoredKnowledgePoint>}
  | {readonly ok: false; readonly error: KnowledgeIndexError}

export interface KnowledgeIndexWriter extends KnowledgeIndex {
  readonly readState: (options: ReadKnowledgeStateOptions) => Promise<KnowledgeIndexStateResult>
  readonly replacePayload: (
    point: StoredKnowledgePoint,
    scope: KnowledgeScope,
  ) => Promise<KnowledgeIndexWriteResult>
  readonly deleteScoped: (
    pointIds: ReadonlyArray<string>,
    scope: KnowledgeScope,
  ) => Promise<KnowledgeIndexWriteResult>
}

export interface SearchKnowledgeIndexOptions {
  readonly denseCandidates: number
  readonly denseVector: ReadonlyArray<number>
  readonly limit: number
  readonly query: string
  readonly repoId: string
  readonly sparseCandidates: number
  readonly workspaceId: string
}

export interface KnowledgeSearchHit {
  readonly payload: KnowledgePointPayload
  readonly pointId: string
  readonly score: number
}

export interface IndexUnavailableError {
  readonly code: 'index-unavailable'
  readonly detail: string
  readonly retryable: true
}

export interface IndexSchemaMismatchError {
  readonly code: 'index-schema-mismatch'
  readonly detail: string
  readonly retryable: false
}

export interface InvalidIndexResponseError {
  readonly code: 'invalid-index-response'
  readonly detail: string
  readonly retryable: false
}

export type KnowledgeIndexError =
  | IndexSchemaMismatchError
  | IndexUnavailableError
  | InvalidIndexResponseError

export type KnowledgeIndexWriteResult =
  | {readonly ok: true}
  | {readonly error: KnowledgeIndexError; readonly ok: false}

export type KnowledgeIndexSearchResult =
  | {readonly ok: true; readonly value: ReadonlyArray<KnowledgeSearchHit>}
  | {readonly error: KnowledgeIndexError; readonly ok: false}

export interface KnowledgeIndex {
  readonly delete: (pointIds: ReadonlyArray<string>) => Promise<KnowledgeIndexWriteResult>
  readonly ensureSchema: (
    options: EnsureKnowledgeIndexSchemaOptions,
  ) => Promise<KnowledgeIndexWriteResult>
  readonly search: (options: SearchKnowledgeIndexOptions) => Promise<KnowledgeIndexSearchResult>
  readonly upsert: (
    points: ReadonlyArray<UpsertKnowledgePoint>,
  ) => Promise<KnowledgeIndexWriteResult>
}
