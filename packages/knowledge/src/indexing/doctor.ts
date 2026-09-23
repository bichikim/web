import {isDeepStrictEqual} from 'node:util'
import type {DenseEmbeddingProvider} from '../embedding/provider'
import type {PreparedKnowledgePoint, PrepareKnowledgeIndexSuccess} from './prepare'
import type {KnowledgeIndexWriter, KnowledgeScope, StoredKnowledgePoint} from './store'

export interface DoctorSourceFailure {
  readonly ok: false
  readonly error: {readonly code: string}
}

export type DoctorSource = PrepareKnowledgeIndexSuccess | DoctorSourceFailure

export interface DoctorCheck {
  readonly name:
    | 'context'
    | 'source'
    | 'relations'
    | 'conflicts'
    | 'embedding'
    | 'schema'
    | 'storage'
    | 'snapshot'
  readonly status: 'pass' | 'fail' | 'skipped'
  readonly code?: string
  readonly counts?: Readonly<Record<string, number>>
}

export interface KnowledgeDoctorReport {
  readonly healthy: boolean
  readonly checks: ReadonlyArray<DoctorCheck>
}

export interface DiagnoseKnowledgeOptions {
  readonly source: DoctorSource
  readonly scope: KnowledgeScope
  readonly index: Pick<KnowledgeIndexWriter, 'ensureSchema' | 'readState'>
  readonly embedding: DenseEmbeddingProvider
}

const compareSnapshot = (
  source: ReadonlyArray<PreparedKnowledgePoint>,
  stored: ReadonlyArray<StoredKnowledgePoint>,
): DoctorCheck => {
  const previous = new Map(stored.map((point) => [point.pointId, point.payload]))
  const ids = new Set(source.map((point) => point.pointId))
  const counts = {
    changed: 0,
    metadata: 0,
    missing: 0,
    stale: stored.filter((point) => !ids.has(point.pointId)).length,
  }
  for (const point of source) {
    const indexed = previous.get(point.pointId)
    if (indexed === undefined) {
      counts.missing += 1
    } else if (indexed.contentHash !== point.payload.contentHash) {
      counts.changed += 1
    } else if (!isDeepStrictEqual(indexed, point.payload)) {
      counts.metadata += 1
    }
  }
  return {
    counts,
    name: 'snapshot',
    status: Object.values(counts).some((count) => count > 0) ? 'fail' : 'pass',
  }
}

const inspectSource = (source: DoctorSource): ReadonlyArray<DoctorCheck> => {
  if (!source.ok) {
    return [{code: source.error.code, name: 'source', status: 'fail'}]
  }
  const counts: Record<string, number> = {}
  for (const diagnostic of source.value.diagnostics) {
    counts[diagnostic.code] = (counts[diagnostic.code] ?? 0) + 1
  }
  const conflicts = source.value.points.filter(
    (point) => point.payload.status === 'conflicting',
  ).length
  return [
    {counts: {units: source.value.points.length}, name: 'source', status: 'pass'},
    {counts, name: 'relations', status: source.value.diagnostics.length > 0 ? 'fail' : 'pass'},
    {counts: {units: conflicts}, name: 'conflicts', status: conflicts > 0 ? 'fail' : 'pass'},
  ]
}

/** Checks source, services and the stored snapshot without writing; reports codes, never raw errors or source text. */
export const diagnoseKnowledge = async (
  options: DiagnoseKnowledgeOptions,
): Promise<KnowledgeDoctorReport> => {
  const checks: DoctorCheck[] = [...inspectSource(options.source)]
  const embedded = await options.embedding.embed(['knowledge schema probe'])
  if (embedded.ok) {
    checks.push({name: 'embedding', status: 'pass'})
    const schema = await options.index.ensureSchema({
      createIfMissing: false,
      embedding: embedded.value.identity,
      schemaVersion: 1,
    })
    checks.push(
      schema.ok
        ? {name: 'schema', status: 'pass'}
        : {code: schema.error.code, name: 'schema', status: 'fail'},
    )
  } else {
    checks.push(
      {code: embedded.error.code, name: 'embedding', status: 'fail'},
      {code: 'embedding-required', name: 'schema', status: 'skipped'},
    )
  }
  const stored = await options.index.readState(options.scope)
  checks.push(
    stored.ok
      ? {name: 'storage', status: 'pass'}
      : {code: stored.error.code, name: 'storage', status: 'fail'},
  )
  checks.push(
    options.source.ok && stored.ok
      ? compareSnapshot(options.source.value.points, stored.value)
      : {code: 'source-and-storage-required', name: 'snapshot', status: 'skipped'},
  )
  return {checks, healthy: checks.every((check) => check.status === 'pass')}
}
