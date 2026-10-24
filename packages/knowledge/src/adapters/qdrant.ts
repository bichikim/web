import {QdrantClient} from '@qdrant/js-client-rest'
import {z} from 'zod'

import {
  KNOWLEDGE_RELATION_TYPES,
  KNOWLEDGE_STATUSES,
  KNOWLEDGE_UNIT_TYPES,
} from '../domain/content-hash'
import type {
  EnsureKnowledgeIndexSchemaOptions,
  IndexUnavailableError,
  KnowledgeIndexSearchResult,
  KnowledgeIndexStateResult,
  KnowledgeIndexWriter,
  KnowledgeIndexWriteResult,
  KnowledgeScope,
  ReadKnowledgeStateOptions,
  SearchKnowledgeIndexOptions,
  StoredKnowledgePoint,
  UpsertKnowledgePoint,
} from '../indexing/store'
import type {EmbeddingIdentity} from '../embedding/provider'
import {
  type FindKnowledgeNeighborsOptions,
  type KnowledgeNeighborReader,
  matchesInspectionSource,
} from '../inspection/index'

export interface QdrantKnowledgeIndex extends KnowledgeIndexWriter, KnowledgeNeighborReader {}

export interface CreateQdrantKnowledgeIndexOptions {
  readonly apiKey?: string
  readonly baseUrl: string
  readonly collection: string
}

const SPARSE_VECTORS_KEY = 'sparse_vectors'
const WITH_PAYLOAD_KEY = 'with_payload'
const WITH_VECTOR_KEY = 'with_vector'
const NEXT_OFFSET_KEY = 'next_page_offset'
const HAS_ID_KEY = 'has_id'
const MUST_NOT_KEY = 'must_not'
const PAGE_SIZE = 128

const completed = (response: {readonly status?: string}): KnowledgeIndexWriteResult =>
  response.status === 'completed'
    ? {ok: true}
    : {
        error: {
          code: 'index-unavailable',
          detail: `Write status: ${response.status}`,
          retryable: true,
        },
        ok: false,
      }

const embeddingIdentitySchema = z.object({
  dimensions: z.number().int().positive(),
  model: z.string(),
  provider: z.string(),
})

const collectionSchema = z.object({
  config: z.object({
    metadata: z.object({
      knowledge: z.object({
        embedding: embeddingIdentitySchema,
        schemaVersion: z.number().int(),
      }),
    }),
    params: z.object({
      [SPARSE_VECTORS_KEY]: z.object({
        sparse: z.object({modifier: z.literal('idf')}),
      }),
      vectors: z.object({
        dense: z.object({
          distance: z.literal('Cosine'),
          size: z.number().int().positive(),
        }),
      }),
    }),
  }),
})

const relationSchema = z.object({
  targetDocId: z.string(),
  targetUnitId: z.string().optional(),
  type: z.enum(KNOWLEDGE_RELATION_TYPES),
})

const pointPayloadSchema = z.object({
  commit: z.string().optional(),
  contentHash: z.string(),
  docId: z.string(),
  endLine: z.number().int().positive().optional(),
  language: z.string().optional(),
  path: z.string(),
  relations: z.array(relationSchema),
  repoId: z.string(),
  startLine: z.number().int().positive().optional(),
  status: z.enum(KNOWLEDGE_STATUSES),
  tags: z.array(z.string()),
  text: z.string(),
  title: z.string(),
  type: z.enum(KNOWLEDGE_UNIT_TYPES),
  unitId: z.string(),
  workspaceId: z.string(),
})

const queryResponseSchema = z.object({
  points: z.array(
    z.object({
      id: z.string(),
      payload: pointPayloadSchema,
      score: z.number(),
    }),
  ),
})

const errorDetail = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const unavailable = (error: unknown): IndexUnavailableError => ({
  code: 'index-unavailable',
  detail: errorDetail(error),
  retryable: true,
})

const mismatch = (detail: string): KnowledgeIndexWriteResult => ({
  error: {code: 'index-schema-mismatch', detail, retryable: false},
  ok: false,
})

const describeIdentity = (identity: EmbeddingIdentity): string =>
  `${identity.provider}/${identity.model}/${identity.dimensions}`

const validateCollection = (
  value: unknown,
  options: EnsureKnowledgeIndexSchemaOptions,
): KnowledgeIndexWriteResult => {
  const parsed = collectionSchema.safeParse(value)
  if (!parsed.success) {
    return mismatch(`collection schema: ${z.prettifyError(parsed.error)}`)
  }

  const actual = parsed.data.config
  const dimensions = actual.params.vectors.dense.size
  if (dimensions !== options.embedding.dimensions) {
    return mismatch(
      `dense dimension: expected ${options.embedding.dimensions}, received ${dimensions}`,
    )
  }

  const actualIdentity = actual.metadata.knowledge.embedding
  if (
    actualIdentity.model !== options.embedding.model ||
    actualIdentity.provider !== options.embedding.provider ||
    actualIdentity.dimensions !== options.embedding.dimensions
  ) {
    return mismatch(
      `embedding identity: expected ${describeIdentity(options.embedding)}, ` +
        `received ${describeIdentity(actualIdentity)}`,
    )
  }

  const {schemaVersion} = actual.metadata.knowledge
  if (schemaVersion !== options.schemaVersion) {
    return mismatch(`schema version: expected ${options.schemaVersion}, received ${schemaVersion}`)
  }

  return {ok: true}
}

const createScopeFilter = (options: KnowledgeScope) => ({
  must: [
    {key: 'repoId', match: {value: options.repoId}},
    {key: 'workspaceId', match: {value: options.workspaceId}},
  ],
})

export const createQdrantKnowledgeIndex = (
  options: CreateQdrantKnowledgeIndexOptions,
): QdrantKnowledgeIndex => {
  const client = new QdrantClient({
    ...(options.apiKey === undefined ? {} : {apiKey: options.apiKey}),
    checkCompatibility: true,
    url: options.baseUrl,
  })

  const ensureSchema = async (
    schemaOptions: EnsureKnowledgeIndexSchemaOptions,
  ): Promise<KnowledgeIndexWriteResult> => {
    try {
      const existence = await client.collectionExists(options.collection)
      if (existence.exists) {
        return validateCollection(await client.getCollection(options.collection), schemaOptions)
      }
      if (schemaOptions.createIfMissing === false) {
        return mismatch('Collection does not exist. Run know index first.')
      }

      await client.createCollection(options.collection, {
        metadata: {
          knowledge: {
            embedding: schemaOptions.embedding,
            schemaVersion: schemaOptions.schemaVersion,
          },
        },
        [SPARSE_VECTORS_KEY]: {sparse: {modifier: 'idf'}},
        vectors: {
          dense: {
            distance: 'Cosine',
            size: schemaOptions.embedding.dimensions,
          },
        },
      })
      return {ok: true}
    } catch (error) {
      return {error: unavailable(error), ok: false}
    }
  }

  const upsert = async (
    points: ReadonlyArray<UpsertKnowledgePoint>,
  ): Promise<KnowledgeIndexWriteResult> => {
    if (points.length === 0) {
      return {ok: true}
    }

    try {
      const response = await client.upsert(options.collection, {
        points: points.map((point) => ({
          id: point.pointId,
          payload: {...point.payload},
          vector: {
            dense: [...point.denseVector],
            sparse: {model: 'qdrant/bm25', text: point.payload.text},
          },
        })),
        wait: true,
      })
      return completed(response)
    } catch (error) {
      return {error: unavailable(error), ok: false}
    }
  }

  const deletePoints = async (
    pointIds: ReadonlyArray<string>,
  ): Promise<KnowledgeIndexWriteResult> => {
    if (pointIds.length === 0) {
      return {ok: true}
    }

    try {
      const response = await client.delete(options.collection, {points: [...pointIds], wait: true})
      return completed(response)
    } catch (error) {
      return {error: unavailable(error), ok: false}
    }
  }

  const search = async (
    searchOptions: SearchKnowledgeIndexOptions,
  ): Promise<KnowledgeIndexSearchResult> => {
    const filter = createScopeFilter(searchOptions)
    try {
      const response: unknown = await client.query(options.collection, {
        filter,
        limit: searchOptions.limit,
        prefetch: [
          {
            filter,
            limit: searchOptions.denseCandidates,
            query: [...searchOptions.denseVector],
            using: 'dense',
          },
          {
            filter,
            limit: searchOptions.sparseCandidates,
            query: {model: 'qdrant/bm25', text: searchOptions.query},
            using: 'sparse',
          },
        ],
        query: {fusion: 'rrf'},
        [WITH_PAYLOAD_KEY]: true,
      })
      const parsed = queryResponseSchema.safeParse(response)
      if (!parsed.success) {
        return {
          error: {
            code: 'invalid-index-response',
            detail: z.prettifyError(parsed.error),
            retryable: false,
          },
          ok: false,
        }
      }

      return {
        ok: true,
        value: parsed.data.points.map((point) => ({
          payload: point.payload,
          pointId: point.id,
          score: point.score,
        })),
      }
    } catch (error) {
      return {error: unavailable(error), ok: false}
    }
  }

  return {
    delete: deletePoints,
    ensureSchema,
    ...createNeighborReader(client, options.collection),
    search,
    upsert,
    ...createPersistence(client, options.collection),
  }
}

const createNeighborReader = (
  client: QdrantClient,
  collection: string,
): KnowledgeNeighborReader => ({
  findNeighbors: async (
    options: FindKnowledgeNeighborsOptions,
  ): Promise<KnowledgeIndexSearchResult> => {
    const invalid: KnowledgeIndexSearchResult = {
      error: {
        code: 'invalid-index-response',
        detail: 'Invalid or changed inspection source or neighbor',
        retryable: false,
      },
      ok: false,
    }
    const MAX_NEIGHBORS = 100
    if (
      !Number.isInteger(options.limit) ||
      options.limit < 1 ||
      options.limit > MAX_NEIGHBORS ||
      options.source.payload.status !== 'active'
    ) {
      return invalid
    }
    const {source} = options
    const must = [
      ...createScopeFilter(source.payload).must,
      {key: 'status', match: {value: 'active'}},
    ]
    const sourceSchema = z.object({
      points: z
        .array(
          z.object({
            id: z.string(),
            payload: pointPayloadSchema,
            vector: z.object({dense: z.array(z.number()).min(1)}),
          }),
        )
        .length(1),
    })
    try {
      const stored = sourceSchema.safeParse(
        await client.scroll(collection, {
          filter: {
            must: [
              ...must,
              {[HAS_ID_KEY]: [source.pointId]},
              {key: 'contentHash', match: {value: source.payload.contentHash}},
            ],
          },
          limit: 1,
          [WITH_PAYLOAD_KEY]: true,
          [WITH_VECTOR_KEY]: ['dense'],
        }),
      )
      if (!stored.success) {
        return invalid
      }
      const [point] = stored.data.points
      if (
        !matchesInspectionSource({
          actual: {payload: point.payload, pointId: point.id},
          expected: source,
        })
      ) {
        return invalid
      }
      const result = queryResponseSchema.safeParse(
        await client.query(collection, {
          filter: {must, [MUST_NOT_KEY]: [{[HAS_ID_KEY]: [source.pointId]}]},
          limit: options.limit,
          query: point.vector.dense,
          using: 'dense',
          [WITH_PAYLOAD_KEY]: true,
        }),
      )
      if (
        !result.success ||
        result.data.points.length > options.limit ||
        result.data.points.some(
          (hit) =>
            hit.id === source.pointId ||
            hit.payload.repoId !== source.payload.repoId ||
            hit.payload.workspaceId !== source.payload.workspaceId ||
            hit.payload.status !== 'active',
        )
      ) {
        return invalid
      }
      return {
        ok: true,
        value: result.data.points.map((hit) => ({
          payload: hit.payload,
          pointId: hit.id,
          score: hit.score,
        })),
      }
    } catch (error) {
      return {error: unavailable(error), ok: false}
    }
  },
})

const createPersistence = (
  client: QdrantClient,
  collection: string,
): Pick<KnowledgeIndexWriter, 'readState' | 'replacePayload' | 'deleteScoped'> => {
  const readState = async (
    scope: ReadKnowledgeStateOptions,
  ): Promise<KnowledgeIndexStateResult> => {
    const points: StoredKnowledgePoint[] = []
    let offset: string | number | undefined
    const visited = new Set<string | number>()
    const schema = z.object({
      [NEXT_OFFSET_KEY]: z.union([z.string(), z.number()]).nullish(),
      points: z.array(z.object({id: z.string(), payload: pointPayloadSchema})),
    })
    try {
      do {
        const response = schema.safeParse(
          // oxlint-disable-next-line no-await-in-loop -- Each page depends on the preceding cursor.
          await client.scroll(collection, {
            filter: {
              must: [
                ...createScopeFilter(scope).must,
                ...(scope.docId === undefined ? [] : [{key: 'docId', match: {value: scope.docId}}]),
                ...(scope.unitId === undefined
                  ? []
                  : [{key: 'unitId', match: {value: scope.unitId}}]),
              ],
            },
            limit: PAGE_SIZE,
            offset,
            [WITH_PAYLOAD_KEY]: true,
            [WITH_VECTOR_KEY]: false,
          }),
        )
        if (!response.success) {
          return {
            error: {
              code: 'invalid-index-response',
              detail: 'Invalid scroll payload',
              retryable: false,
            },
            ok: false,
          }
        }
        for (const point of response.data.points) {
          if (
            point.payload.repoId !== scope.repoId ||
            point.payload.workspaceId !== scope.workspaceId ||
            (scope.docId !== undefined && point.payload.docId !== scope.docId) ||
            (scope.unitId !== undefined && point.payload.unitId !== scope.unitId)
          ) {
            return {
              error: {
                code: 'invalid-index-response',
                detail: 'Scroll returned an out-of-scope point',
                retryable: false,
              },
              ok: false,
            }
          }
          points.push({payload: point.payload, pointId: point.id})
        }
        offset = response.data[NEXT_OFFSET_KEY] ?? undefined
        if (offset !== undefined) {
          if (visited.has(offset)) {
            return {
              error: {
                code: 'invalid-index-response',
                detail: 'Repeated scroll cursor',
                retryable: false,
              },
              ok: false,
            }
          }
          visited.add(offset)
        }
      } while (offset !== undefined)
      return {ok: true, value: points}
    } catch (error) {
      return {error: unavailable(error), ok: false}
    }
  }

  const deleteScoped = async (
    pointIds: ReadonlyArray<string>,
    scope: KnowledgeScope,
  ): Promise<KnowledgeIndexWriteResult> => {
    if (pointIds.length === 0) {
      return {ok: true}
    }
    try {
      return completed(
        await client.delete(collection, {
          filter: {must: [...createScopeFilter(scope).must, {[HAS_ID_KEY]: [...pointIds]}]},
          wait: true,
        }),
      )
    } catch (error) {
      return {error: unavailable(error), ok: false}
    }
  }

  const replacePayload = async (
    point: StoredKnowledgePoint,
    scope: KnowledgeScope,
  ): Promise<KnowledgeIndexWriteResult> => {
    if (point.payload.repoId !== scope.repoId || point.payload.workspaceId !== scope.workspaceId) {
      return mismatch('Payload is outside the selected scope')
    }
    try {
      return completed(
        await client.overwritePayload(collection, {
          filter: {must: [...createScopeFilter(scope).must, {[HAS_ID_KEY]: [point.pointId]}]},
          payload: {...point.payload},
          wait: true,
        }),
      )
    } catch (error) {
      return {error: unavailable(error), ok: false}
    }
  }

  return {deleteScoped, readState, replacePayload}
}
