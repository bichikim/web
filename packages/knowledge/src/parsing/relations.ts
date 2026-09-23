import {posix} from 'node:path'

import type {KnowledgeHashRelation} from '../domain/content-hash'
import type {KnowledgeReference, ParsedKnowledgeDocument, ParsedKnowledgeUnit} from './document'

export interface ResolvedKnowledgeUnit extends ParsedKnowledgeUnit {
  readonly relations: ReadonlyArray<KnowledgeHashRelation>
}

export interface ResolvedKnowledgeDocument extends ParsedKnowledgeDocument {
  readonly units: ReadonlyArray<ResolvedKnowledgeUnit>
}

export interface RelationDiagnostic {
  readonly code: 'implicit-document-id' | 'invalid-reference' | 'missing-document' | 'missing-unit'
  readonly docId: string
  readonly target: string
  readonly unitId: string
}

export interface ResolveKnowledgeRelationsSuccess {
  readonly ok: true
  readonly value: {
    readonly diagnostics: ReadonlyArray<RelationDiagnostic>
    readonly documents: ReadonlyArray<ResolvedKnowledgeDocument>
  }
}

export interface ResolveKnowledgeRelationsFailure {
  readonly ok: false
  readonly error: {
    readonly code: 'duplicate-document-id' | 'duplicate-document-path'
    readonly value: string
  }
}

export type ResolveKnowledgeRelationsResult =
  | ResolveKnowledgeRelationsFailure
  | ResolveKnowledgeRelationsSuccess

interface ReferenceTarget {
  readonly key: string
  readonly unitId?: string
}

const parseTarget = (
  reference: KnowledgeReference,
  document: ParsedKnowledgeDocument,
): ReferenceTarget | undefined => {
  const separator = reference.target.indexOf('#')
  const raw = separator < 0 ? reference.target : reference.target.slice(0, separator)
  const fragment = separator < 0 ? undefined : reference.target.slice(separator + 1)
  if (reference.kind === 'logical') {
    return {key: raw === '' ? document.docId : raw, unitId: fragment || undefined}
  }
  try {
    const path = decodeURIComponent(raw)
    if (path.includes('?') || /[\\\p{Cc}]/u.test(path) || posix.isAbsolute(path)) {
      return undefined
    }
    const key = path === '' ? document.path : posix.join(posix.dirname(document.path), path)
    if (key === '..' || key.startsWith('../')) {
      return undefined
    }
    return {
      key,
      unitId: fragment === undefined || fragment === '' ? undefined : decodeURIComponent(fragment),
    }
  } catch {
    return undefined
  }
}

/** Resolves references within one repository/workspace snapshot and reports broken targets. */
export const resolveKnowledgeRelations = (
  documents: ReadonlyArray<ParsedKnowledgeDocument>,
): ResolveKnowledgeRelationsResult => {
  const byPath = new Map<string, ParsedKnowledgeDocument>()
  const byId = new Map<string, ParsedKnowledgeDocument>()
  for (const document of documents) {
    if (byPath.has(document.path)) {
      return {error: {code: 'duplicate-document-path', value: document.path}, ok: false}
    }
    if (byId.has(document.docId)) {
      return {error: {code: 'duplicate-document-id', value: document.docId}, ok: false}
    }
    byPath.set(document.path, document)
    byId.set(document.docId, document)
  }

  const diagnostics: RelationDiagnostic[] = []
  const resolved = documents.map(
    (document): ResolvedKnowledgeDocument => ({
      ...document,
      units: document.units.map((unit): ResolvedKnowledgeUnit => {
        const relations = new Map<string, KnowledgeHashRelation>()
        for (const reference of unit.references) {
          const report = (code: RelationDiagnostic['code']): void => {
            diagnostics.push({
              code,
              docId: document.docId,
              target: reference.target,
              unitId: unit.unitId,
            })
          }
          const target = parseTarget(reference, document)
          const destination =
            target === undefined
              ? undefined
              : (reference.kind === 'logical' ? byId : byPath).get(target.key)
          if (target === undefined) {
            report('invalid-reference')
          } else if (destination === undefined) {
            report('missing-document')
          } else if (
            target.unitId !== undefined &&
            !destination.units.some((entry) => entry.unitId === target.unitId)
          ) {
            report('missing-unit')
          } else {
            if (!destination.explicitId && destination.docId !== document.docId) {
              report('implicit-document-id')
            }
            const relation: KnowledgeHashRelation = {
              targetDocId: destination.docId,
              ...(target.unitId === undefined ? {} : {targetUnitId: target.unitId}),
              type: reference.type,
            }
            relations.set(
              JSON.stringify([relation.type, relation.targetDocId, relation.targetUnitId]),
              relation,
            )
          }
        }
        return {...unit, relations: [...relations.values()]}
      }),
    }),
  )
  return {ok: true, value: {diagnostics, documents: resolved}}
}
