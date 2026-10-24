import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  doctorKnowledgeRepository,
  loadGenerationSource,
  loadInspectionSource,
  reindexKnowledgeRepository,
} from '../runtime'
import {createGitRepositoryProbe} from '../../adapters/git'
import {createOllamaEmbeddingProvider} from '../../adapters/ollama'
import {createQdrantKnowledgeIndex, type QdrantKnowledgeIndex} from '../../adapters/qdrant'
import {loadKnowledgeSettings} from '../../config/runtime'
import {readKnowledgeFiles} from '../../source/files'
import type {KnowledgeIndexWriter} from '../../indexing/store'

vi.mock('../../adapters/git', () => ({createGitRepositoryProbe: vi.fn()}))
vi.mock('../../adapters/ollama', () => ({createOllamaEmbeddingProvider: vi.fn()}))
vi.mock('../../adapters/qdrant', () => ({createQdrantKnowledgeIndex: vi.fn()}))
vi.mock('../../config/runtime', () => ({loadKnowledgeSettings: vi.fn()}))
vi.mock('../../source/files', () => ({readKnowledgeFiles: vi.fn()}))

const identity = {dimensions: 2, model: 'test', provider: 'ollama'}
const scope = {repoId: 'test/maintenance', workspaceId: 'refs/heads/main'}
const index = {
  delete: vi.fn(),
  deleteScoped: vi.fn<KnowledgeIndexWriter['deleteScoped']>(),
  ensureSchema: vi.fn<KnowledgeIndexWriter['ensureSchema']>(),
  findNeighbors: vi.fn<QdrantKnowledgeIndex['findNeighbors']>(),
  readState: vi.fn<KnowledgeIndexWriter['readState']>(),
  replacePayload: vi.fn(),
  search: vi.fn(),
  upsert: vi.fn<KnowledgeIndexWriter['upsert']>(),
} satisfies QdrantKnowledgeIndex
const embed = vi.fn(async (inputs: ReadonlyArray<string>) => ({
  ok: true as const,
  value: {identity, vectors: inputs.map(() => [1, 0])},
}))

beforeEach(() => {
  index.ensureSchema.mockResolvedValue({ok: true})
  index.readState.mockResolvedValue({ok: true, value: []})
  index.upsert.mockResolvedValue({ok: true})
  index.deleteScoped.mockResolvedValue({ok: true})
  vi.mocked(createGitRepositoryProbe).mockReturnValue({
    inspect: vi.fn(async () => ({
      ok: true as const,
      value: {commit: 'sha', ref: scope.workspaceId, root: '/repo'},
    })),
  })
  vi.mocked(loadKnowledgeSettings).mockResolvedValue({
    ok: true,
    value: {
      collection: 'test-maintenance',
      ollamaUrl: 'http://127.0.0.1:11434',
      qdrantUrl: 'http://127.0.0.1:6333',
      repository: {
        embedding: {model: 'test', provider: 'ollama'},
        exclude: [],
        include: ['**/*.md'],
        repoId: scope.repoId,
        search: {denseCandidates: 40, sparseCandidates: 40},
        version: 1,
        workspace: {mode: 'ref'},
      },
    },
  })
  vi.mocked(readKnowledgeFiles).mockResolvedValue({
    ok: true,
    value: [{format: 'markdown', path: 'doc.md', source: '# Title\nContent'}],
  })
  vi.mocked(createOllamaEmbeddingProvider).mockReturnValue({embed})
  vi.mocked(createQdrantKnowledgeIndex).mockReturnValue(index)
})
afterEach(() => vi.clearAllMocks())

describe('maintenance runtime', () => {
  it('should expose scoped read-only hybrid research search and separate transport failures', async () => {
    index.search.mockResolvedValue({ok: true, value: []})
    const context = await loadInspectionSource('/repo')
    expect(await context.research?.search({limit: 3, query: 'storage scope'})).toEqual({
      ok: true,
      value: [],
    })
    expect(embed).toHaveBeenCalledWith(['storage scope'])
    expect(index.search).toHaveBeenCalledWith(
      expect.objectContaining({...scope, limit: 3, query: 'storage scope'}),
    )
    expect(index.upsert).not.toHaveBeenCalled()
    index.search.mockRejectedValueOnce(new Error('offline'))
    expect(await context.research?.search({limit: 3, query: 'scope'})).toMatchObject({ok: false})
  })
  it('should expose the configured scoped neighbor reader without embeddings or index mutations', async () => {
    const context = await loadInspectionSource('/repo')
    expect(context).toMatchObject({...scope, ollamaUrl: 'http://127.0.0.1:11434', points: []})
    expect(context.reader.findNeighbors).toBe(index.findNeighbors)
    expect(index.readState).toHaveBeenCalledWith(scope)
    expect(createQdrantKnowledgeIndex).toHaveBeenCalledWith(
      expect.objectContaining({baseUrl: 'http://127.0.0.1:6333', collection: 'test-maintenance'}),
    )
    expect(embed).not.toHaveBeenCalled()
    expect(index.upsert).not.toHaveBeenCalled()
  })
  it('should read scoped generation input without embeddings or index writes', async () => {
    expect(await loadGenerationSource('/repo')).toMatchObject({...scope, points: []})
    expect(index.readState).toHaveBeenCalledWith(scope)
    expect(embed).not.toHaveBeenCalled()
    expect(index.upsert).not.toHaveBeenCalled()
  })
  it('should preview the selected scope without embeddings, schema writes, or point mutations', async () => {
    const result = await reindexKnowledgeRepository({confirmed: false, inputPath: '/repo'})
    expect(result).toMatchObject({
      command: 'reindex',
      executed: false,
      plan: {...scope, stale: 0, units: 1},
    })
    expect(embed).not.toHaveBeenCalled()
    expect(index.ensureSchema).not.toHaveBeenCalled()
    expect(index.upsert).not.toHaveBeenCalled()
    expect(index.deleteScoped).not.toHaveBeenCalled()
  })
  it('should publish its plan before confirmed writes and recreate every source vector', async () => {
    const onPlan = vi.fn()
    const result = await reindexKnowledgeRepository({confirmed: true, inputPath: '/repo', onPlan})
    expect(result).toMatchObject({executed: true, progress: {embedded: 1}})
    expect(onPlan.mock.invocationCallOrder[0]).toBeLessThan(
      index.upsert.mock.invocationCallOrder[0],
    )
    expect(index.ensureSchema).toHaveBeenCalledWith({
      createIfMissing: false,
      embedding: identity,
      schemaVersion: 1,
    })
    expect(index.delete).not.toHaveBeenCalled()
  })
  it('should refuse schema mismatch without upserts or deletion', async () => {
    index.ensureSchema.mockResolvedValueOnce({
      error: {code: 'index-schema-mismatch', detail: 'model', retryable: false},
      ok: false,
    })
    await expect(
      reindexKnowledgeRepository({confirmed: true, inputPath: '/repo'}),
    ).rejects.toMatchObject({
      result: {error: {code: 'index-schema-mismatch'}},
    })
    expect(index.upsert).not.toHaveBeenCalled()
    expect(index.deleteScoped).not.toHaveBeenCalled()
  })
  it('should stop reindex before writes when source files are unreadable', async () => {
    vi.mocked(readKnowledgeFiles).mockResolvedValueOnce({
      error: {code: 'source-read-failed', detail: 'PRIVATE', path: 'doc.md'},
      ok: false,
    })
    await expect(
      reindexKnowledgeRepository({confirmed: true, inputPath: '/repo'}),
    ).rejects.toBeDefined()
    expect(embed).not.toHaveBeenCalled()
    expect(index.upsert).not.toHaveBeenCalled()
  })
  it('should diagnose source failure and still inspect external services without leaking its detail', async () => {
    vi.mocked(readKnowledgeFiles).mockResolvedValueOnce({
      error: {code: 'source-read-failed', detail: 'PRIVATE', path: 'doc.md'},
      ok: false,
    })
    const result = await doctorKnowledgeRepository('/repo')
    expect(result.healthy).toBe(false)
    expect(result.checks).toContainEqual({
      code: 'source-read-failed',
      name: 'source',
      status: 'fail',
    })
    expect(index.readState).toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toContain('PRIVATE')
  })
  it('should report invalid context without exposing raw config errors', async () => {
    vi.mocked(loadKnowledgeSettings).mockResolvedValueOnce({
      error: {code: 'invalid-config', issues: ['PRIVATE']},
      ok: false,
    })
    const result = await doctorKnowledgeRepository('/repo')
    expect(result).toMatchObject({checks: [{name: 'context', status: 'fail'}], healthy: false})
    expect(JSON.stringify(result)).not.toContain('PRIVATE')
  })
})
