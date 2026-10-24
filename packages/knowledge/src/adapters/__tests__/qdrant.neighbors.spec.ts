import {QdrantClient} from '@qdrant/js-client-rest'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createQdrantKnowledgeIndex} from '../qdrant'
vi.mock('@qdrant/js-client-rest', () => ({QdrantClient: vi.fn()}))
const scroll = vi.fn()
const query = vi.fn()
const source = {
  payload: {
    contentHash: 'hash',
    docId: 'a',
    path: 'a.md',
    relations: [],
    repoId: 'repo',
    status: 'active',
    tags: [],
    text: 'Rule',
    title: 'A',
    type: 'rule',
    unitId: 'main',
    workspaceId: 'main',
  },
  pointId: 'a',
} as const
const neighbor = {id: 'b', payload: {...source.payload, docId: 'b'}, score: 0.9}
const createIndex = () =>
  createQdrantKnowledgeIndex({baseUrl: 'http://localhost:6333', collection: 'test'})
beforeEach(() => {
  vi.mocked(QdrantClient).mockImplementation(function QdrantClientMock() {
    return {query, scroll} as unknown as QdrantClient
  })
  scroll.mockResolvedValue({
    points: [{id: 'a', payload: source.payload, vector: {dense: [0.1, 0.2]}}],
  })
  query.mockResolvedValue({points: [neighbor]})
})
afterEach(() => vi.resetAllMocks())
it.each([0, 101, 1.5])('should reject invalid limits before storage requests', async (limit) => {
  expect(await createIndex().findNeighbors({limit, source})).toMatchObject({ok: false})
  expect(scroll).not.toHaveBeenCalled()
})
it('should reject inactive seeds and self or malformed query results', async () => {
  expect(
    await createIndex().findNeighbors({
      limit: 10,
      source: {...source, payload: {...source.payload, status: 'deprecated'}},
    }),
  ).toMatchObject({ok: false})
  expect(scroll).not.toHaveBeenCalled()
  query
    .mockResolvedValueOnce({points: [{...neighbor, id: source.pointId}]})
    .mockResolvedValueOnce({points: [{id: 'b'}]})
    .mockResolvedValueOnce({points: [neighbor, neighbor]})
  expect(await createIndex().findNeighbors({limit: 10, source})).toMatchObject({ok: false})
  expect(await createIndex().findNeighbors({limit: 10, source})).toMatchObject({ok: false})
  expect(await createIndex().findNeighbors({limit: 1, source})).toMatchObject({ok: false})
})
it('should reuse the scoped stored dense vector and query only active neighbors without self', async () => {
  expect(await createIndex().findNeighbors({limit: 10, source})).toEqual({
    ok: true,
    value: [{payload: neighbor.payload, pointId: 'b', score: 0.9}],
  })
  expect(scroll).toHaveBeenCalledWith(
    'test',
    expect.objectContaining({
      filter: {
        must: [
          {key: 'repoId', match: {value: 'repo'}},
          {key: 'workspaceId', match: {value: 'main'}},
          {key: 'status', match: {value: 'active'}},
          {has_id: ['a']},
          {key: 'contentHash', match: {value: 'hash'}},
        ],
      },
      limit: 1,
      with_payload: true,
      with_vector: ['dense'],
    }),
  )
  expect(query).toHaveBeenCalledWith(
    'test',
    expect.objectContaining({
      filter: {
        must: [
          {key: 'repoId', match: {value: 'repo'}},
          {key: 'workspaceId', match: {value: 'main'}},
          {key: 'status', match: {value: 'active'}},
        ],
        must_not: [{has_id: ['a']}],
      },
      limit: 10,
      query: [0.1, 0.2],
      using: 'dense',
      with_payload: true,
    }),
  )
  expect(query.mock.calls[0][1]).not.toHaveProperty('prefetch')
})
it.each([
  {points: []},
  {points: [{id: 'a', payload: source.payload, vector: {dense: []}}]},
  {points: [{id: 'a', payload: {...source.payload, repoId: 'other'}, vector: {dense: [1]}}]},
  {points: [{id: 'a', payload: {...source.payload, contentHash: 'changed'}, vector: {dense: [1]}}]},
])('should reject missing, changed or malformed source vectors', async (response) => {
  scroll.mockResolvedValue(response)
  expect(await createIndex().findNeighbors({limit: 10, source})).toMatchObject({
    error: {code: 'invalid-index-response'},
    ok: false,
  })
  expect(query).not.toHaveBeenCalled()
})
it.each(['repoId', 'workspaceId', 'status'] as const)(
  'should reject out-of-contract neighbor %s',
  async (field) => {
    query.mockResolvedValue({
      points: [{...neighbor, payload: {...neighbor.payload, [field]: 'other'}}],
    })
    expect(await createIndex().findNeighbors({limit: 10, source})).toMatchObject({
      error: {code: 'invalid-index-response'},
      ok: false,
    })
  },
)
it('should translate transport errors and distinguish valid empty neighbors', async () => {
  query.mockRejectedValueOnce(new Error('offline'))
  expect(await createIndex().findNeighbors({limit: 10, source})).toMatchObject({
    error: {code: 'index-unavailable'},
    ok: false,
  })
  query.mockResolvedValue({points: []})
  expect(await createIndex().findNeighbors({limit: 10, source})).toEqual({ok: true, value: []})
})
