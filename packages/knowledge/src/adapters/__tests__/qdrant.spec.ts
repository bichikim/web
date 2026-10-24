import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  collectionExists: vi.fn(),
  createCollection: vi.fn(),
  delete: vi.fn(),
  getCollection: vi.fn(),
  overwritePayload: vi.fn(),
  query: vi.fn(),
  scroll: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: vi.fn(function QdrantClient() {
    return mocks
  }),
}))

import {QdrantClient} from '@qdrant/js-client-rest'

import {createQdrantKnowledgeIndex} from '../qdrant'

const EMBEDDING_IDENTITY = {
  dimensions: 3,
  model: 'bge-m3',
  provider: 'ollama',
}

const PAYLOAD = {
  commit: 'abc123',
  contentHash: 'sha256:content',
  docId: 'architecture/session',
  endLine: 20,
  language: 'ko',
  path: 'docs/session.md',
  relations: [],
  repoId: 'github.com/bichikim/web',
  startLine: 10,
  status: 'active',
  tags: ['auth'],
  text: '인증 토큰 갱신 정책',
  title: '세션 정책',
  type: 'rule',
  unitId: 'refresh',
  workspaceId: 'refs/heads/dev',
} as const

const createIndex = () =>
  createQdrantKnowledgeIndex({
    apiKey: 'secret',
    baseUrl: 'http://127.0.0.1:6333',
    collection: 'knowledge-v1',
  })

const matchingCollection = () => ({
  config: {
    metadata: {
      knowledge: {
        embedding: EMBEDDING_IDENTITY,
        schemaVersion: 1,
      },
    },
    params: {
      sparse_vectors: {
        sparse: {
          modifier: 'idf',
        },
      },
      vectors: {
        dense: {
          distance: 'Cosine',
          size: 3,
        },
      },
    },
  },
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createQdrantKnowledgeIndex', () => {
  it('should apply document and unit filters to every scoped scroll page', async () => {
    mocks.scroll.mockResolvedValueOnce({next_page_offset: 'next', points: []})
    mocks.scroll.mockResolvedValue({
      next_page_offset: null,
      points: [{id: 'one', payload: PAYLOAD}],
    })
    const result = await createIndex().readState({
      docId: PAYLOAD.docId,
      repoId: PAYLOAD.repoId,
      unitId: PAYLOAD.unitId,
      workspaceId: PAYLOAD.workspaceId,
    })
    expect(result).toMatchObject({ok: true, value: [{pointId: 'one'}]})
    expect(mocks.scroll).toHaveBeenCalledTimes(2)
    expect(mocks.scroll.mock.calls[0][1].filter).toEqual(mocks.scroll.mock.calls[1][1].filter)
    expect(mocks.scroll).toHaveBeenCalledWith(
      'knowledge-v1',
      expect.objectContaining({
        filter: {
          must: [
            {key: 'repoId', match: {value: PAYLOAD.repoId}},
            {key: 'workspaceId', match: {value: PAYLOAD.workspaceId}},
            {key: 'docId', match: {value: PAYLOAD.docId}},
            {key: 'unitId', match: {value: PAYLOAD.unitId}},
          ],
        },
      }),
    )
  })
  it.each(['docId', 'unitId', 'repoId', 'workspaceId'] as const)(
    'should reject a scroll point that does not match requested %s',
    async (field) => {
      mocks.scroll.mockResolvedValue({
        next_page_offset: null,
        points: [{id: 'one', payload: PAYLOAD}],
      })
      const scope = {
        docId: String(PAYLOAD.docId),
        repoId: String(PAYLOAD.repoId),
        unitId: String(PAYLOAD.unitId),
        workspaceId: String(PAYLOAD.workspaceId),
      }
      scope[field] = 'other'
      expect(await createIndex().readState(scope)).toMatchObject({
        error: {code: 'invalid-index-response'},
        ok: false,
      })
    },
  )
  it('should read all scoped pages before returning index state', async () => {
    mocks.scroll
      .mockResolvedValueOnce({next_page_offset: 'one', points: [{id: 'one', payload: PAYLOAD}]})
      .mockResolvedValueOnce({next_page_offset: null, points: [{id: 'two', payload: PAYLOAD}]})
    const index = createIndex()
    const scope = {repoId: PAYLOAD.repoId, workspaceId: PAYLOAD.workspaceId}
    await expect(index.readState(scope)).resolves.toEqual({
      ok: true,
      value: [
        {payload: PAYLOAD, pointId: 'one'},
        {payload: PAYLOAD, pointId: 'two'},
      ],
    })
    expect(mocks.scroll).toHaveBeenLastCalledWith(
      'knowledge-v1',
      expect.objectContaining({
        filter: {
          must: [
            {key: 'repoId', match: {value: scope.repoId}},
            {key: 'workspaceId', match: {value: scope.workspaceId}},
          ],
        },
        offset: 'one',
      }),
    )
  })

  it('should scope metadata replacement and stale deletion on the server', async () => {
    mocks.overwritePayload.mockResolvedValue({status: 'completed'})
    mocks.delete.mockResolvedValue({status: 'completed'})
    const scope = {repoId: PAYLOAD.repoId, workspaceId: PAYLOAD.workspaceId}
    const filter = {
      must: [
        {key: 'repoId', match: {value: scope.repoId}},
        {key: 'workspaceId', match: {value: scope.workspaceId}},
        {has_id: ['one']},
      ],
    }
    const index = createIndex()
    await expect(index.replacePayload({payload: PAYLOAD, pointId: 'one'}, scope)).resolves.toEqual({
      ok: true,
    })
    await expect(index.deleteScoped(['one'], scope)).resolves.toEqual({ok: true})
    expect(mocks.overwritePayload).toHaveBeenCalledWith('knowledge-v1', {
      filter,
      payload: PAYLOAD,
      wait: true,
    })
    expect(mocks.delete).toHaveBeenCalledWith('knowledge-v1', {filter, wait: true})
  })

  it('should not create a collection during search schema validation', async () => {
    mocks.collectionExists.mockResolvedValue({exists: false})
    await expect(
      createIndex().ensureSchema({
        createIfMissing: false,
        embedding: EMBEDDING_IDENTITY,
        schemaVersion: 1,
      }),
    ).resolves.toMatchObject({error: {code: 'index-schema-mismatch'}, ok: false})
    expect(mocks.createCollection).not.toHaveBeenCalled()
  })
  it('should create a versioned dense and BM25 collection when it does not exist', async () => {
    mocks.collectionExists.mockResolvedValue({exists: false})
    mocks.createCollection.mockResolvedValue(true)
    const index = createIndex()

    await expect(
      index.ensureSchema({embedding: EMBEDDING_IDENTITY, schemaVersion: 1}),
    ).resolves.toEqual({ok: true})
    expect(QdrantClient).toHaveBeenCalledWith({
      apiKey: 'secret',
      checkCompatibility: true,
      url: 'http://127.0.0.1:6333',
    })
    expect(mocks.createCollection).toHaveBeenCalledWith('knowledge-v1', {
      metadata: {
        knowledge: {
          embedding: EMBEDDING_IDENTITY,
          schemaVersion: 1,
        },
      },
      sparse_vectors: {
        sparse: {
          modifier: 'idf',
        },
      },
      vectors: {
        dense: {
          distance: 'Cosine',
          size: 3,
        },
      },
    })
  })

  it('should accept an existing collection with the same schema and model identity', async () => {
    mocks.collectionExists.mockResolvedValue({exists: true})
    mocks.getCollection.mockResolvedValue(matchingCollection())
    const index = createIndex()

    await expect(
      index.ensureSchema({embedding: EMBEDDING_IDENTITY, schemaVersion: 1}),
    ).resolves.toEqual({ok: true})
    expect(mocks.createCollection).not.toHaveBeenCalled()
  })

  it('should create a client without an API key when none is configured', () => {
    createQdrantKnowledgeIndex({
      baseUrl: 'http://127.0.0.1:6333',
      collection: 'knowledge-v1',
    })

    expect(QdrantClient).toHaveBeenCalledWith({
      checkCompatibility: true,
      url: 'http://127.0.0.1:6333',
    })
  })

  it('should reject an existing collection with a different dense dimension', async () => {
    mocks.collectionExists.mockResolvedValue({exists: true})
    const collection = matchingCollection()
    collection.config.params.vectors.dense.size = 1024
    mocks.getCollection.mockResolvedValue(collection)
    const index = createIndex()

    await expect(
      index.ensureSchema({embedding: EMBEDDING_IDENTITY, schemaVersion: 1}),
    ).resolves.toEqual({
      error: {
        code: 'index-schema-mismatch',
        detail: 'dense dimension: expected 3, received 1024',
        retryable: false,
      },
      ok: false,
    })
  })

  it.each([
    [
      {
        ...EMBEDDING_IDENTITY,
        model: 'different-model',
      },
      'embedding identity: expected ollama/bge-m3/3, received ollama/different-model/3',
    ],
    [
      {
        ...EMBEDDING_IDENTITY,
        provider: 'different-provider',
      },
      'embedding identity: expected ollama/bge-m3/3, received different-provider/bge-m3/3',
    ],
  ])('should reject a different embedding identity', async (embedding, detail) => {
    mocks.collectionExists.mockResolvedValue({exists: true})
    const collection = matchingCollection()
    collection.config.metadata.knowledge.embedding = embedding
    mocks.getCollection.mockResolvedValue(collection)
    const index = createIndex()

    await expect(
      index.ensureSchema({embedding: EMBEDDING_IDENTITY, schemaVersion: 1}),
    ).resolves.toEqual({
      error: {
        code: 'index-schema-mismatch',
        detail,
        retryable: false,
      },
      ok: false,
    })
  })

  it('should reject a different schema version', async () => {
    mocks.collectionExists.mockResolvedValue({exists: true})
    const collection = matchingCollection()
    collection.config.metadata.knowledge.schemaVersion = 2
    mocks.getCollection.mockResolvedValue(collection)
    const index = createIndex()

    await expect(
      index.ensureSchema({embedding: EMBEDDING_IDENTITY, schemaVersion: 1}),
    ).resolves.toEqual({
      error: {
        code: 'index-schema-mismatch',
        detail: 'schema version: expected 1, received 2',
        retryable: false,
      },
      ok: false,
    })
  })

  it('should reject an existing collection without the required schema metadata', async () => {
    mocks.collectionExists.mockResolvedValue({exists: true})
    mocks.getCollection.mockResolvedValue({config: {params: {}}})
    const index = createIndex()

    await expect(
      index.ensureSchema({embedding: EMBEDDING_IDENTITY, schemaVersion: 1}),
    ).resolves.toMatchObject({
      error: {
        code: 'index-schema-mismatch',
        detail: expect.stringContaining('collection schema:'),
        retryable: false,
      },
      ok: false,
    })
  })

  it('should upsert dense vectors and server-side BM25 documents', async () => {
    mocks.upsert.mockResolvedValue({status: 'completed'})
    const index = createIndex()

    await expect(
      index.upsert([
        {
          denseVector: [0.1, 0.2, 0.3],
          payload: PAYLOAD,
          pointId: '223b4f3b-0862-5cdb-888f-338fc638c36f',
        },
      ]),
    ).resolves.toEqual({ok: true})
    expect(mocks.upsert).toHaveBeenCalledWith('knowledge-v1', {
      points: [
        {
          id: '223b4f3b-0862-5cdb-888f-338fc638c36f',
          payload: PAYLOAD,
          vector: {
            dense: [0.1, 0.2, 0.3],
            sparse: {
              model: 'qdrant/bm25',
              text: '인증 토큰 갱신 정책',
            },
          },
        },
      ],
      wait: true,
    })
  })

  it('should delete only the explicit point IDs', async () => {
    mocks.delete.mockResolvedValue({status: 'completed'})
    const index = createIndex()

    await expect(index.delete(['one', 'two'])).resolves.toEqual({ok: true})
    expect(mocks.delete).toHaveBeenCalledWith('knowledge-v1', {
      points: ['one', 'two'],
      wait: true,
    })
  })

  it('should skip Qdrant writes for empty change sets', async () => {
    const index = createIndex()

    await expect(index.upsert([])).resolves.toEqual({ok: true})
    await expect(index.delete([])).resolves.toEqual({ok: true})
    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(mocks.delete).not.toHaveBeenCalled()
  })

  it('should run a scoped dense and BM25 RRF query and return domain hits', async () => {
    mocks.query.mockResolvedValue({
      points: [
        {
          id: '223b4f3b-0862-5cdb-888f-338fc638c36f',
          payload: PAYLOAD,
          score: 0.9,
          version: 1,
        },
      ],
    })
    const index = createIndex()

    await expect(
      index.search({
        denseCandidates: 40,
        denseVector: [0.1, 0.2, 0.3],
        limit: 10,
        query: '인증 정책',
        repoId: 'github.com/bichikim/web',
        sparseCandidates: 40,
        workspaceId: 'refs/heads/dev',
      }),
    ).resolves.toEqual({
      ok: true,
      value: [
        {
          payload: PAYLOAD,
          pointId: '223b4f3b-0862-5cdb-888f-338fc638c36f',
          score: 0.9,
        },
      ],
    })
    expect(mocks.query).toHaveBeenCalledWith('knowledge-v1', {
      filter: {
        must: [
          {key: 'repoId', match: {value: 'github.com/bichikim/web'}},
          {key: 'workspaceId', match: {value: 'refs/heads/dev'}},
        ],
      },
      limit: 10,
      prefetch: [
        {
          filter: {
            must: [
              {key: 'repoId', match: {value: 'github.com/bichikim/web'}},
              {key: 'workspaceId', match: {value: 'refs/heads/dev'}},
            ],
          },
          limit: 40,
          query: [0.1, 0.2, 0.3],
          using: 'dense',
        },
        {
          filter: {
            must: [
              {key: 'repoId', match: {value: 'github.com/bichikim/web'}},
              {key: 'workspaceId', match: {value: 'refs/heads/dev'}},
            ],
          },
          limit: 40,
          query: {
            model: 'qdrant/bm25',
            text: '인증 정책',
          },
          using: 'sparse',
        },
      ],
      query: {fusion: 'rrf'},
      with_payload: true,
    })
  })

  it('should reject a search hit without the Knowledge payload contract', async () => {
    mocks.query.mockResolvedValue({
      points: [{id: 1, payload: {title: 'missing fields'}, score: 0.5, version: 1}],
    })
    const index = createIndex()

    await expect(
      index.search({
        denseCandidates: 2,
        denseVector: [1, 0, 0],
        limit: 1,
        query: 'query',
        repoId: 'github.com/bichikim/web',
        sparseCandidates: 2,
        workspaceId: 'refs/heads/dev',
      }),
    ).resolves.toMatchObject({
      error: {
        code: 'invalid-index-response',
        retryable: false,
      },
      ok: false,
    })
  })

  it('should normalize Qdrant failures as retryable index unavailability', async () => {
    mocks.collectionExists.mockRejectedValue(new Error('connection refused'))
    const index = createIndex()

    await expect(
      index.ensureSchema({embedding: EMBEDDING_IDENTITY, schemaVersion: 1}),
    ).resolves.toEqual({
      error: {
        code: 'index-unavailable',
        detail: 'connection refused',
        retryable: true,
      },
      ok: false,
    })
  })

  it.each([
    ['upsert', () => createIndex().upsert([{denseVector: [1], payload: PAYLOAD, pointId: 'one'}])],
    ['delete', () => createIndex().delete(['one'])],
    [
      'query',
      () =>
        createIndex().search({
          denseCandidates: 1,
          denseVector: [1],
          limit: 1,
          query: 'query',
          repoId: 'github.com/bichikim/web',
          sparseCandidates: 1,
          workspaceId: 'refs/heads/dev',
        }),
    ],
  ])('should normalize a failed %s operation', async (operation, run) => {
    mocks[operation].mockRejectedValue(new Error(`${operation} stopped`))

    await expect(run()).resolves.toEqual({
      error: {
        code: 'index-unavailable',
        detail: `${operation} stopped`,
        retryable: true,
      },
      ok: false,
    })
  })

  it('should stringify a non-Error Qdrant failure', async () => {
    const failure: unknown = 'connection stopped'
    mocks.collectionExists.mockRejectedValue(failure)
    const index = createIndex()

    await expect(
      index.ensureSchema({embedding: EMBEDDING_IDENTITY, schemaVersion: 1}),
    ).resolves.toEqual({
      error: {
        code: 'index-unavailable',
        detail: 'connection stopped',
        retryable: true,
      },
      ok: false,
    })
  })
})
