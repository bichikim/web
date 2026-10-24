import {expect, it, vi} from 'vitest'
import {retrieveInspectionPairs} from '../index'
import type {KnowledgeIndexSearchResult, StoredKnowledgePoint} from '../../indexing/store'

const point = (id: string): StoredKnowledgePoint => ({
  payload: {
    contentHash: id,
    docId: id,
    path: `${id}.md`,
    relations: [],
    repoId: 'repo',
    status: 'active',
    tags: [],
    text: id,
    title: id,
    type: 'rule',
    unitId: 'main',
    workspaceId: 'main',
  },
  pointId: id,
})
const scope = {repoId: 'repo', workspaceId: 'main'}

it('should retrieve beyond the seed sample, rank unique pairs and bound requests', async () => {
  const points = Array.from({length: 22}, (_, index) => point(String(index).padStart(2, '0')))
  const findNeighbors = vi
    .fn()
    .mockResolvedValue({ok: true, value: []})
    .mockResolvedValueOnce({
      ok: true,
      value: [
        {...points[21], score: 0.9},
        {...points[1], score: 0.5},
      ],
    })
    .mockResolvedValueOnce({ok: true, value: [{...points[0], score: 0.5}]})
  expect(
    await retrieveInspectionPairs({...scope, limit: 1, points, reader: {findNeighbors}}),
  ).toMatchObject({
    ok: true,
    value: {
      consideredUnits: 20,
      eligibleUnits: 22,
      pairs: [{left: points[0], right: points[21]}],
      retrieval: {candidatePairs: 2, errors: [], neighborsPerUnit: 10, seedLimit: 20},
      truncated: true,
    },
  })
  expect(findNeighbors).toHaveBeenCalledTimes(20)
  expect(findNeighbors).toHaveBeenCalledWith({limit: 10, source: points[0]})
})

it('should exclude self hits and retain valid independent results after a retrieval failure', async () => {
  const points = [point('a'), point('b'), point('c')]
  const findNeighbors = vi
    .fn()
    .mockResolvedValue({ok: true, value: []})
    .mockResolvedValueOnce({error: {code: 'index-unavailable'}, ok: false})
    .mockResolvedValueOnce({
      ok: true,
      value: [
        {...points[1], score: 1},
        {...points[2], score: 0.8},
      ],
    })
  expect(
    await retrieveInspectionPairs({...scope, limit: 10, points, reader: {findNeighbors}}),
  ).toMatchObject({
    ok: true,
    value: {
      pairs: [{left: points[1], right: points[2]}],
      retrieval: {errors: [{code: 'index-unavailable', pointId: 'a'}]},
    },
  })
})

it.each([
  'repoId',
  'workspaceId',
  'contentHash',
  'status',
  'text',
  'title',
  'docId',
  'unitId',
] as const)(
  'should reject changed or out-of-scope %s rather than classify stale content',
  async (field) => {
    const points = [point('a'), point('b')]
    const findNeighbors = vi
      .fn()
      .mockResolvedValue({ok: true, value: []})
      .mockResolvedValueOnce({
        ok: true,
        value: [{...points[1], payload: {...points[1].payload, [field]: 'changed'}, score: 0.9}],
      })
    expect(
      await retrieveInspectionPairs({...scope, limit: 10, points, reader: {findNeighbors}}),
    ).toMatchObject({
      ok: true,
      value: {
        pairs: [],
        retrieval: {errors: [{code: 'inspection-candidate-changed', pointId: 'a'}]},
      },
    })
  },
)

it('should not query inactive or out-of-scope sources and distinguish empty results from errors', async () => {
  const findNeighbors = vi
    .fn<() => Promise<KnowledgeIndexSearchResult>>()
    .mockResolvedValue({ok: true, value: []})
  const points = [
    point('a'),
    {...point('b'), payload: {...point('b').payload, status: 'deprecated' as const}},
    {...point('c'), payload: {...point('c').payload, repoId: 'other'}},
  ]
  expect(
    await retrieveInspectionPairs({...scope, limit: 10, points, reader: {findNeighbors}}),
  ).toMatchObject({ok: true, value: {eligibleUnits: 1, pairs: [], retrieval: {errors: []}}})
  expect(findNeighbors).not.toHaveBeenCalled()
  expect(
    await retrieveInspectionPairs({...scope, limit: 0, points, reader: {findNeighbors}}),
  ).toEqual({error: {code: 'invalid-inspection-limit'}, ok: false})
})

it('should use the strongest direction and deterministic pair order for equal scores', async () => {
  const points = [point('c'), point('b'), point('a')]
  const findNeighbors = vi
    .fn()
    .mockResolvedValue({ok: true, value: []})
    .mockResolvedValueOnce({
      ok: true,
      value: [
        {...point('b'), score: 0.1},
        {...point('c'), score: 0.8},
      ],
    })
    .mockResolvedValueOnce({ok: true, value: [{...point('a'), score: 0.8}]})
  expect(
    await retrieveInspectionPairs({...scope, limit: 10, points, reader: {findNeighbors}}),
  ).toMatchObject({
    ok: true,
    value: {
      pairs: [
        {left: point('a'), right: point('b')},
        {left: point('a'), right: point('c')},
      ],
      retrieval: {candidatePairs: 2},
    },
  })
})

it.each([
  [{...point('unknown'), score: 0.8}],
  [{...point('b'), score: Number.NaN}],
  Array.from({length: 11}, () => ({...point('b'), score: 0.8})),
])('should report invalid candidate responses without classifying them', async (hits) => {
  const findNeighbors = vi
    .fn()
    .mockResolvedValue({ok: true, value: []})
    .mockResolvedValueOnce({ok: true, value: hits})
  expect(
    await retrieveInspectionPairs({
      ...scope,
      limit: 10,
      points: [point('a'), point('b')],
      reader: {findNeighbors},
    }),
  ).toMatchObject({
    ok: true,
    value: {pairs: [], retrieval: {errors: [{code: 'inspection-candidate-changed', pointId: 'a'}]}},
  })
})
