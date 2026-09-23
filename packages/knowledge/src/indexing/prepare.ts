import {createKnowledgeContentHash} from '../domain/content-hash'
import {createKnowledgePointId} from '../domain/point-id'
import {
  type ParsedKnowledgeDocument,
  parseKnowledgeDocument,
  type ParseKnowledgeDocumentFailure,
  type ParseKnowledgeDocumentOptions,
} from '../parsing/document'
import {
  type RelationDiagnostic,
  resolveKnowledgeRelations,
  type ResolveKnowledgeRelationsFailure,
} from '../parsing/relations'
import type {RepositoryIdentity} from '../source/repository'
import type {KnowledgePointPayload} from './store'

export interface PrepareKnowledgeIndexOptions {
  readonly documents: ReadonlyArray<ParseKnowledgeDocumentOptions>
  readonly repository: RepositoryIdentity
  readonly schemaVersion: number
}

export interface PreparedKnowledgePoint {
  readonly payload: KnowledgePointPayload
  readonly pointId: string
}

export interface PrepareKnowledgeIndexSuccess {
  readonly ok: true
  readonly value: {
    readonly diagnostics: ReadonlyArray<RelationDiagnostic>
    readonly points: ReadonlyArray<PreparedKnowledgePoint>
  }
}

export type PrepareKnowledgeIndexResult =
  | ParseKnowledgeDocumentFailure
  | PrepareKnowledgeIndexSuccess
  | ResolveKnowledgeRelationsFailure

/** Prepares deterministic point payloads from one source snapshot without embedding or writes. */
export const prepareKnowledgeIndex = (
  options: PrepareKnowledgeIndexOptions,
): PrepareKnowledgeIndexResult => {
  const documents: ParsedKnowledgeDocument[] = []
  const ordered = options.documents.toSorted((left, right) => left.path.localeCompare(right.path))
  for (const source of ordered) {
    const parsed = parseKnowledgeDocument(source)
    if (!parsed.ok) {
      return parsed
    }
    documents.push(parsed.value)
  }
  const resolved = resolveKnowledgeRelations(documents)
  if (!resolved.ok) {
    return resolved
  }

  const {commit, repoId, workspaceId} = options.repository
  const points = resolved.value.documents.flatMap((document) =>
    document.units.map((unit) => ({
      payload: {
        commit,
        contentHash: createKnowledgeContentHash(unit),
        docId: document.docId,
        endLine: unit.endLine,
        ...(document.language === undefined ? {} : {language: document.language}),
        path: document.path,
        relations: unit.relations,
        repoId,
        startLine: unit.startLine,
        status: unit.status,
        tags: unit.tags,
        text: unit.text,
        title: unit.title,
        type: unit.type,
        unitId: unit.unitId,
        workspaceId,
      },
      pointId: createKnowledgePointId({
        docId: document.docId,
        repoId,
        schemaVersion: options.schemaVersion,
        unitId: unit.unitId,
        workspaceId,
      }),
    })),
  )
  return {ok: true, value: {diagnostics: resolved.value.diagnostics, points}}
}
