import {describe, expect, it, vi} from 'vitest'

import {executeKnowledgeIndex} from '../execute'
import type {KnowledgeIndexWriter, KnowledgePointPayload} from '../store'
import type {DenseEmbeddingProvider} from '../../embedding/provider'

const identity = {dimensions: 2, model: 'test', provider: 'ollama'}
const scope = {repoId: 'test/repo', workspaceId: 'refs/heads/main'}
const payload: KnowledgePointPayload = {
  ...scope,
  contentHash: 'hash',
  docId: 'a',
  path: 'a.md',
  relations: [],
  status: 'active',
  tags: [],
  text: 'A',
  title: 'A',
  type: 'document',
  unitId: 'a',
}
const createIndex = () =>
  ({
    delete: vi.fn(),
    deleteScoped: vi.fn(async () => ({ok: true as const})),
    ensureSchema: vi.fn(async () => ({ok: true as const})),
    readState: vi.fn(async () => ({ok: true as const, value: [{payload, pointId: 'existing'}]})),
    replacePayload: vi.fn(async () => ({ok: true as const})),
    search: vi.fn(),
    upsert: vi.fn(async () => ({ok: true as const})),
  }) satisfies KnowledgeIndexWriter
const createEmbedding = (): DenseEmbeddingProvider => ({
  embed: vi.fn(async (inputs) => ({
    ok: true as const,
    value: {identity, vectors: inputs.map(() => [1, 0])},
  })),
})

describe('executeKnowledgeIndex', () => {
  it('should re-embed unchanged points in rebuild mode without deleting them first', async () => {
    const index = createIndex()
    const embedding = createEmbedding()
    const result = await executeKnowledgeIndex({
      embedding,
      identity,
      index,
      mode: 'rebuild',
      points: [{payload, pointId: 'existing'}],
      scope,
    })
    expect(result).toMatchObject({ok: true, value: {deleted: 0, embedded: 1, unchanged: 0}})
    expect(embedding.embed).toHaveBeenCalledWith(['A'])
    expect(index.replacePayload).not.toHaveBeenCalled()
    expect(index.deleteScoped).not.toHaveBeenCalled()
  })
  it('should retain the prior scope when rebuilding fails before upsert', async () => {
    const index = createIndex()
    const embedding: DenseEmbeddingProvider = {
      embed: vi.fn<DenseEmbeddingProvider['embed']>(async () => ({
        error: {code: 'embedding-unavailable', detail: 'offline', retryable: true},
        ok: false,
      })),
    }
    expect(
      await executeKnowledgeIndex({
        embedding,
        identity,
        index,
        mode: 'rebuild',
        points: [{payload, pointId: 'existing'}],
        scope,
      }),
    ).toMatchObject({ok: false})
    expect(index.upsert).not.toHaveBeenCalled()
    expect(index.deleteScoped).not.toHaveBeenCalled()
  })
  it('should reuse unchanged content and refresh only its location payload', async () => {
    const index = createIndex()
    const embedding = createEmbedding()
    const result = await executeKnowledgeIndex({
      embedding,
      identity,
      index,
      points: [{payload: {...payload, path: 'moved.md'}, pointId: 'existing'}],
      scope,
    })
    expect(result).toMatchObject({ok: true, value: {deleted: 0, embedded: 0, metadata: 1}})
    expect(embedding.embed).not.toHaveBeenCalled()
    expect(index.replacePayload).toHaveBeenCalledWith(
      {payload: {...payload, path: 'moved.md'}, pointId: 'existing'},
      scope,
    )
  })
  it('should delete stale IDs only after new points were successfully saved', async () => {
    const index = createIndex()
    const result = await executeKnowledgeIndex({
      embedding: createEmbedding(),
      identity,
      index,
      points: [{payload, pointId: 'new'}],
      scope,
    })
    expect(result).toMatchObject({ok: true, value: {deleted: 1, embedded: 1}})
    expect(index.deleteScoped).toHaveBeenCalledWith(['existing'], scope)
    expect(index.upsert.mock.invocationCallOrder[0]).toBeLessThan(
      index.deleteScoped.mock.invocationCallOrder[0],
    )
  })
  it('should retain stale points on embedding failure and report completed work', async () => {
    const index = createIndex()
    const embedding: DenseEmbeddingProvider = {
      embed: vi.fn(async () => ({
        error: {
          code: 'embedding-unavailable' as const,
          detail: 'offline',
          retryable: true as const,
        },
        ok: false as const,
      })),
    }
    expect(
      await executeKnowledgeIndex({
        embedding,
        identity,
        index,
        points: [{payload, pointId: 'new'}],
        scope,
      }),
    ).toMatchObject({
      error: {code: 'embedding-unavailable'},
      ok: false,
      progress: {deleted: 0, embedded: 0},
    })
    expect(index.deleteScoped).not.toHaveBeenCalled()
  })
  it('should reject points outside the selected scope', async () => {
    const index = createIndex()
    const embedding = createEmbedding()
    expect(
      await executeKnowledgeIndex({
        embedding,
        identity,
        index,
        points: [{payload: {...payload, workspaceId: 'other'}, pointId: 'new'}],
        scope,
      }),
    ).toMatchObject({ok: false})
    expect(index.readState).not.toHaveBeenCalled()
  })
  it('should reject a changed model before writing or deleting points', async () => {
    const index = createIndex()
    const result = await executeKnowledgeIndex({
      embedding: createEmbedding(),
      identity: {...identity, model: 'other'},
      index,
      points: [{payload, pointId: 'new'}],
      scope,
    })
    expect(result).toMatchObject({error: {code: 'index-schema-mismatch'}, ok: false})
    expect(index.upsert).not.toHaveBeenCalled()
    expect(index.deleteScoped).not.toHaveBeenCalled()
  })
  it('should stop before cleanup when a write fails', async () => {
    const index = createIndex()
    const upsert = vi.fn<KnowledgeIndexWriter['upsert']>(async () => ({
      error: {code: 'index-unavailable', detail: 'offline', retryable: true},
      ok: false,
    }))
    const result = await executeKnowledgeIndex({
      embedding: createEmbedding(),
      identity,
      index: {...index, upsert},
      points: [{payload, pointId: 'new'}],
      scope,
    })
    expect(result).toMatchObject({ok: false, progress: {deleted: 0, embedded: 0}})
    expect(index.deleteScoped).not.toHaveBeenCalled()
  })
  it('should not mutate points when the complete stored snapshot cannot be read', async () => {
    const index = createIndex()
    const readState = vi.fn<KnowledgeIndexWriter['readState']>(async () => ({
      error: {code: 'index-unavailable', detail: 'incomplete page', retryable: true},
      ok: false,
    }))
    const embedding = createEmbedding()
    const result = await executeKnowledgeIndex({
      embedding,
      identity,
      index: {...index, readState},
      points: [],
      scope,
    })
    expect(result).toMatchObject({ok: false})
    expect(embedding.embed).not.toHaveBeenCalled()
    expect(index.deleteScoped).not.toHaveBeenCalled()
  })
})
