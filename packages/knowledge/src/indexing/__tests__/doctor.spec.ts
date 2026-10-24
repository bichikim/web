import {describe, expect, it, vi} from 'vitest'
import {diagnoseKnowledge} from '../doctor'
import type {PrepareKnowledgeIndexSuccess} from '../prepare'
import type {KnowledgeIndexWriter} from '../store'
import type {DenseEmbeddingProvider} from '../../embedding/provider'

const scope = {repoId: 'test/repo', workspaceId: 'refs/heads/main'}
const source: PrepareKnowledgeIndexSuccess = {
  ok: true,
  value: {
    diagnostics: [],
    points: [
      {
        payload: {
          ...scope,
          contentHash: 'hash',
          docId: 'doc',
          path: 'doc.md',
          relations: [],
          status: 'active',
          tags: [],
          text: 'PRIVATE TEXT',
          title: 'Title',
          type: 'rule',
          unitId: 'unit',
        },
        pointId: 'one',
      },
    ],
  },
}
const setup = () => ({
  embedding: {
    embed: vi.fn<DenseEmbeddingProvider['embed']>(async () => ({
      ok: true,
      value: {identity: {dimensions: 2, model: 'test', provider: 'ollama'}, vectors: [[1, 0]]},
    })),
  },
  index: {
    ensureSchema: vi.fn<KnowledgeIndexWriter['ensureSchema']>(async () => ({ok: true})),
    readState: vi.fn<KnowledgeIndexWriter['readState']>(async () => ({
      ok: true,
      value: source.value.points,
    })),
  },
})

describe('diagnoseKnowledge', () => {
  it('should report missing and content-changed units separately', async () => {
    const options = setup()
    options.index.readState.mockResolvedValue({
      ok: true,
      value: [
        {
          ...source.value.points[0],
          payload: {...source.value.points[0].payload, contentHash: 'old'},
        },
      ],
    })
    const report = await diagnoseKnowledge({
      ...options,
      scope,
      source: {
        ok: true,
        value: {
          diagnostics: [],
          points: [...source.value.points, {...source.value.points[0], pointId: 'new'}],
        },
      },
    })
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        counts: {changed: 1, metadata: 0, missing: 1, stale: 0},
        name: 'snapshot',
      }),
    )
  })
  it('should report a matching snapshot and validate schema without creating it', async () => {
    const options = setup()
    const report = await diagnoseKnowledge({...options, scope, source})
    expect(report.healthy).toBe(true)
    expect(options.index.ensureSchema).toHaveBeenCalledWith(
      expect.objectContaining({createIfMissing: false}),
    )
    expect(options.index.readState).toHaveBeenCalledWith(scope)
    expect(JSON.stringify(report)).not.toContain('PRIVATE TEXT')
  })
  it('should distinguish stale, missing, changed, and metadata-only points', async () => {
    const options = setup()
    options.index.readState.mockResolvedValue({
      ok: true,
      value: [
        {...source.value.points[0], payload: {...source.value.points[0].payload, path: 'old.md'}},
        {...source.value.points[0], pointId: 'stale'},
      ],
    })
    const report = await diagnoseKnowledge({...options, scope, source})
    expect(report.healthy).toBe(false)
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        counts: {changed: 0, metadata: 1, missing: 0, stale: 1},
        name: 'snapshot',
        status: 'fail',
      }),
    )
  })
  it('should keep diagnosing stored state when Ollama is unavailable and suppress raw errors', async () => {
    const options = setup()
    options.embedding.embed.mockResolvedValue({
      error: {code: 'embedding-unavailable', detail: 'SECRET API KEY', retryable: true},
      ok: false,
    })
    const report = await diagnoseKnowledge({...options, scope, source})
    expect(report.healthy).toBe(false)
    expect(options.index.ensureSchema).not.toHaveBeenCalled()
    expect(options.index.readState).toHaveBeenCalled()
    expect(report.checks).toContainEqual({
      code: 'embedding-required',
      name: 'schema',
      status: 'skipped',
    })
    expect(JSON.stringify(report)).not.toContain('SECRET API KEY')
  })
  it('should report source failures without exposing the parser input or stopping service checks', async () => {
    const options = setup()
    const failure = {
      error: {code: 'duplicate-document-id', value: 'SECRET SOURCE'},
      ok: false as const,
    }
    const report = await diagnoseKnowledge({
      ...options,
      scope,
      source: failure,
    })
    expect(report.checks).toContainEqual({
      code: 'duplicate-document-id',
      name: 'source',
      status: 'fail',
    })
    expect(options.embedding.embed).toHaveBeenCalled()
    expect(JSON.stringify(report)).not.toContain('SECRET SOURCE')
  })
  it('should fail on broken references and explicit conflicting units', async () => {
    const report = await diagnoseKnowledge({
      ...setup(),
      scope,
      source: {
        ok: true,
        value: {
          diagnostics: [
            {code: 'missing-document', docId: 'doc', target: 'PRIVATE TARGET', unitId: 'unit'},
          ],
          points: [
            {
              ...source.value.points[0],
              payload: {...source.value.points[0].payload, status: 'conflicting'},
            },
          ],
        },
      },
    })
    expect(report.healthy).toBe(false)
    expect(report.checks).toContainEqual(
      expect.objectContaining({name: 'relations', status: 'fail'}),
    )
    expect(report.checks).toContainEqual(
      expect.objectContaining({name: 'conflicts', status: 'fail'}),
    )
    expect(JSON.stringify(report)).not.toContain('PRIVATE TARGET')
  })
  it('should propagate schema mismatch and unavailable Qdrant as failed checks', async () => {
    const options = setup()
    options.index.ensureSchema.mockResolvedValue({
      error: {code: 'index-schema-mismatch', detail: 'model', retryable: false},
      ok: false,
    })
    options.index.readState.mockResolvedValue({
      error: {code: 'index-unavailable', detail: 'offline', retryable: true},
      ok: false,
    })
    const report = await diagnoseKnowledge({...options, scope, source})
    expect(report.checks).toContainEqual({
      code: 'index-schema-mismatch',
      name: 'schema',
      status: 'fail',
    })
    expect(report.checks).toContainEqual({
      code: 'index-unavailable',
      name: 'storage',
      status: 'fail',
    })
  })
})
