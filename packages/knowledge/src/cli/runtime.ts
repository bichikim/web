import {createHash} from 'node:crypto'
import {mkdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'

import {createGitRepositoryProbe} from '../adapters/git'
import {createOllamaEmbeddingProvider} from '../adapters/ollama'
import {createQdrantKnowledgeIndex} from '../adapters/qdrant'
import {loadKnowledgeSettings} from '../config/runtime'
import {executeKnowledgeIndex, type IndexProgress} from '../indexing/execute'
import {diagnoseKnowledge, type DoctorSource, type KnowledgeDoctorReport} from '../indexing/doctor'
import {prepareKnowledgeIndex} from '../indexing/prepare'
import {getKnowledge, getKnowledgeStatus, type KnowledgeIndexStatus} from '../indexing/read'
import {getRelatedKnowledge, type RelatedKnowledge} from '../indexing/related'
import type {KnowledgeScope, StoredKnowledgePoint} from '../indexing/store'
import type {KnowledgeNeighborReader, ResearchReader} from '../inspection/index'
import {readKnowledgeFiles} from '../source/files'
import {resolveRepositoryIdentity} from '../source/repository'
import {withKnowledgeLock} from './lock'

export class KnowledgeCommandFailure extends Error {
  readonly result: unknown
  constructor(result: unknown) {
    super('Knowledge command failed')
    this.result = result
  }
}

export interface GenerationSourceResult extends KnowledgeScope {
  readonly ollamaUrl: string
  readonly points: ReadonlyArray<StoredKnowledgePoint>
}
/** Reads indexed units and the configured generator endpoint without embedding or index mutations. */
export const loadGenerationSource = async (inputPath: string): Promise<GenerationSourceResult> => {
  const {index, repository, settings} = await createContext(inputPath)
  const scope = {repoId: repository.repoId, workspaceId: repository.workspaceId}
  const points = unwrap(await index.readState(scope))
  return {...scope, ollamaUrl: settings.ollamaUrl, points}
}

export interface InspectionSourceResult extends GenerationSourceResult {
  readonly research?: ResearchReader
  readonly reader: KnowledgeNeighborReader
}
/** Reads the scoped source snapshot and its configured read-only neighbor capability. */
export const loadInspectionSource = async (inputPath: string): Promise<InspectionSourceResult> => {
  const {index, repository, settings} = await createContext(inputPath)
  const scope = {repoId: repository.repoId, workspaceId: repository.workspaceId}
  const points = unwrap(await index.readState(scope))
  return {
    ...scope,
    ollamaUrl: settings.ollamaUrl,
    points,
    reader: {findNeighbors: index.findNeighbors},
    research: {
      search: async (options) => {
        try {
          const result = await searchKnowledgeRepository({...options, inputPath})
          if (result.repoId !== scope.repoId || result.workspaceId !== scope.workspaceId) {
            return {
              error: {
                code: 'invalid-index-response',
                detail: 'Research scope changed',
                retryable: false,
              },
              ok: false,
            }
          }
          return {ok: true, value: result.hits}
        } catch {
          return {
            error: {
              code: 'index-unavailable',
              detail: 'Research search unavailable',
              retryable: true,
            },
            ok: false,
          }
        }
      },
    },
  }
}

const unwrap = <T>(
  result: {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: unknown},
): T => {
  if (!result.ok) {
    throw new KnowledgeCommandFailure(result)
  }
  return result.value
}

const createContext = async (inputPath: string) => {
  const probe = createGitRepositoryProbe()
  const discovered = unwrap(await probe.inspect(resolve(inputPath)))
  const settings = unwrap(await loadKnowledgeSettings({env: process.env, root: discovered.root}))
  const repository = unwrap(
    await resolveRepositoryIdentity({
      configuredRepoId: settings.repository.repoId,
      inputPath: discovered.root,
      probe,
    }),
  )
  const embedding = createOllamaEmbeddingProvider({
    baseUrl: settings.ollamaUrl,
    model: settings.repository.embedding.model,
  })
  const index = createQdrantKnowledgeIndex({
    apiKey: settings.apiKey,
    baseUrl: settings.qdrantUrl,
    collection: settings.collection,
  })
  return {embedding, index, repository, settings}
}

const withRepositoryLock = async <T>(
  context: Awaited<ReturnType<typeof createContext>>,
  operation: () => Promise<T>,
): Promise<T> => {
  const {repository, settings} = context
  const key = createHash('sha256')
    .update(
      JSON.stringify([
        settings.qdrantUrl,
        settings.collection,
        repository.repoId,
        repository.workspaceId,
      ]),
    )
    .digest('hex')
  const directory = join(tmpdir(), 'knowledge-cli', key)
  await mkdir(directory, {recursive: true})
  return withKnowledgeLock(directory, operation)
}

export const indexKnowledgeRepository = async (inputPath: string) => {
  const context = await createContext(inputPath)
  const {embedding, index, repository, settings} = context
  return withRepositoryLock(context, async () => {
    const documents = unwrap(
      await readKnowledgeFiles({
        exclude: settings.repository.exclude,
        include: settings.repository.include,
        root: repository.root,
      }),
    )
    const prepared = unwrap(prepareKnowledgeIndex({documents, repository, schemaVersion: 1}))
    const probe = unwrap(await embedding.embed(['knowledge schema probe']))
    const schema = await index.ensureSchema({embedding: probe.identity, schemaVersion: 1})
    if (!schema.ok) {
      throw new KnowledgeCommandFailure(schema)
    }
    const result = await executeKnowledgeIndex({
      embedding,
      identity: probe.identity,
      index,
      points: prepared.points,
      scope: repository,
    })
    if (!result.ok) {
      throw new KnowledgeCommandFailure(result)
    }
    return {
      command: 'index' as const,
      diagnostics: prepared.diagnostics,
      documents: documents.length,
      points: prepared.points.length,
      repoId: repository.repoId,
      workspaceId: repository.workspaceId,
      ...result.value,
    }
  })
}

export interface SearchKnowledgeRepositoryOptions {
  readonly inputPath: string
  readonly query: string
  readonly limit: number
}

export const searchKnowledgeRepository = async (options: SearchKnowledgeRepositoryOptions) => {
  const {embedding, index, repository, settings} = await createContext(options.inputPath)
  const embedded = unwrap(await embedding.embed([options.query]))
  const schema = await index.ensureSchema({
    createIfMissing: false,
    embedding: embedded.identity,
    schemaVersion: 1,
  })
  if (!schema.ok) {
    throw new KnowledgeCommandFailure(schema)
  }
  const hits = unwrap(
    await index.search({
      denseCandidates: Math.max(options.limit, settings.repository.search.denseCandidates),
      denseVector: embedded.vectors[0],
      limit: options.limit,
      query: options.query,
      repoId: repository.repoId,
      sparseCandidates: Math.max(options.limit, settings.repository.search.sparseCandidates),
      workspaceId: repository.workspaceId,
    }),
  )
  return {
    command: 'search' as const,
    hits,
    query: options.query,
    repoId: repository.repoId,
    workspaceId: repository.workspaceId,
  }
}

export interface GetKnowledgeRepositoryOptions {
  readonly inputPath: string
  readonly logicalId: string
}

export interface RelatedKnowledgeRepositoryOptions extends GetKnowledgeRepositoryOptions {
  readonly limit: number
}
export interface RelatedKnowledgeRepositoryResult extends KnowledgeScope, RelatedKnowledge {
  readonly logicalId: string
}

export const relatedKnowledgeRepository = async (
  options: RelatedKnowledgeRepositoryOptions,
): Promise<RelatedKnowledgeRepositoryResult> => {
  const {index, repository} = await createContext(options.inputPath)
  const related = unwrap(await getRelatedKnowledge({...options, index, scope: repository}))
  return {
    ...related,
    logicalId: options.logicalId,
    repoId: repository.repoId,
    workspaceId: repository.workspaceId,
  }
}

export interface GetKnowledgeRepositoryResult extends KnowledgeScope {
  readonly command: 'get'
  readonly logicalId: string
  readonly points: ReadonlyArray<StoredKnowledgePoint>
}

export interface StatusKnowledgeRepositoryResult extends KnowledgeScope, KnowledgeIndexStatus {
  readonly command: 'status'
  readonly collection: string
}

export const getKnowledgeRepository = async (
  options: GetKnowledgeRepositoryOptions,
): Promise<GetKnowledgeRepositoryResult> => {
  const {index, repository} = await createContext(options.inputPath)
  const points = unwrap(
    await getKnowledge({index, logicalId: options.logicalId, scope: repository}),
  )
  return {
    command: 'get',
    logicalId: options.logicalId,
    points,
    repoId: repository.repoId,
    workspaceId: repository.workspaceId,
  }
}

export const statusKnowledgeRepository = async (
  inputPath: string,
): Promise<StatusKnowledgeRepositoryResult> => {
  const {index, repository, settings} = await createContext(inputPath)
  const status = unwrap(await getKnowledgeStatus({index, scope: repository}))
  return {
    collection: settings.collection,
    command: 'status',
    repoId: repository.repoId,
    workspaceId: repository.workspaceId,
    ...status,
  }
}

const loadDoctorSource = async (
  context: Awaited<ReturnType<typeof createContext>>,
): Promise<DoctorSource> => {
  const {repository, settings} = context
  const documents = await readKnowledgeFiles({
    exclude: settings.repository.exclude,
    include: settings.repository.include,
    root: repository.root,
  })
  if (!documents.ok) {
    return documents
  }
  return prepareKnowledgeIndex({documents: documents.value, repository, schemaVersion: 1})
}

export interface DoctorKnowledgeRepositoryResult extends KnowledgeDoctorReport {
  readonly command: 'doctor'
}

export const doctorKnowledgeRepository = async (
  inputPath: string,
): Promise<DoctorKnowledgeRepositoryResult> => {
  try {
    const context = await createContext(inputPath)
    const source = await loadDoctorSource(context)
    const report = await diagnoseKnowledge({
      embedding: context.embedding,
      index: context.index,
      scope: context.repository,
      source,
    })
    return {command: 'doctor', ...report}
  } catch {
    // Context failures can include configuration secrets; report no raw error details.
    return {
      checks: [{code: 'repository-or-config-unavailable', name: 'context', status: 'fail'}],
      command: 'doctor',
      healthy: false,
    }
  }
}

export interface ReindexPlan extends KnowledgeScope {
  readonly relationDiagnostics: number
  readonly collection: string
  readonly units: number
  readonly stored: number
  readonly stale: number
}

export interface ReindexKnowledgeRepositoryOptions {
  readonly inputPath: string
  readonly confirmed: boolean
  readonly onPlan?: (plan: ReindexPlan) => void
}

export interface ReindexPreview {
  readonly command: 'reindex'
  readonly executed: false
  readonly plan: ReindexPlan
}

export interface ReindexCompleted {
  readonly command: 'reindex'
  readonly executed: true
  readonly plan: ReindexPlan
  readonly progress: IndexProgress
}

export type ReindexKnowledgeRepositoryResult = ReindexPreview | ReindexCompleted

/** Rebuilds one existing scope only after confirmation, preserving old points until replacement writes succeed. */
export const reindexKnowledgeRepository = async (
  options: ReindexKnowledgeRepositoryOptions,
): Promise<ReindexKnowledgeRepositoryResult> => {
  const context = await createContext(options.inputPath)
  return withRepositoryLock(context, async () => {
    const {repository, settings, index, embedding} = context
    const source = unwrap(await loadDoctorSource(context))
    const stored = unwrap(await index.readState(repository))
    const ids = new Set(source.points.map((point) => point.pointId))
    const plan: ReindexPlan = {
      collection: settings.collection,
      relationDiagnostics: source.diagnostics.length,
      repoId: repository.repoId,
      stale: stored.filter((point) => !ids.has(point.pointId)).length,
      stored: stored.length,
      units: source.points.length,
      workspaceId: repository.workspaceId,
    }
    options.onPlan?.(plan)
    if (!options.confirmed) {
      return {command: 'reindex', executed: false, plan}
    }
    const probe = unwrap(await embedding.embed(['knowledge schema probe']))
    const schema = await index.ensureSchema({
      createIfMissing: false,
      embedding: probe.identity,
      schemaVersion: 1,
    })
    if (!schema.ok) {
      throw new KnowledgeCommandFailure(schema)
    }
    const progress = unwrap(
      await executeKnowledgeIndex({
        embedding,
        identity: probe.identity,
        index,
        mode: 'rebuild',
        points: source.points,
        scope: repository,
      }),
    )
    return {command: 'reindex', executed: true, plan, progress}
  })
}
