import {describe, expect, it, vi} from 'vitest'
import {getRelatedKnowledge} from '../related'
import type {KnowledgeIndexWriter, StoredKnowledgePoint} from '../store'

const scope = {repoId: 'test/repo', workspaceId: 'refs/heads/main'}
const point: StoredKnowledgePoint = {
  payload: {
    ...scope,
    contentHash: 'hash',
    docId: 'a',
    path: 'a.md',
    relations: [{targetDocId: 'b', targetUnitId: 'two', type: 'depends-on'}],
    status: 'active',
    tags: [],
    text: 'A',
    title: 'A',
    type: 'rule',
    unitId: 'one',
  },
  pointId: 'a',
}

describe('getRelatedKnowledge', () => {
  it.each([0, 101, 1.5])('should reject invalid limit %s before reading', async (limit) => {
    const readState = vi.fn<KnowledgeIndexWriter['readState']>()
    expect(
      await getRelatedKnowledge({index: {readState}, limit, logicalId: 'a', scope}),
    ).toMatchObject({error: {code: 'invalid-related-limit'}, ok: false})
    expect(readState).not.toHaveBeenCalled()
  })
  it('should resolve outgoing targets in the same scope and stop at one hop', async () => {
    const target = {...point, payload: {...point.payload, docId: 'b', unitId: 'two'}, pointId: 'b'}
    const readState = vi
      .fn<KnowledgeIndexWriter['readState']>()
      .mockResolvedValueOnce({ok: true, value: [point]})
      .mockResolvedValueOnce({ok: true, value: [target]})
    const result = await getRelatedKnowledge({
      index: {readState},
      limit: 10,
      logicalId: 'a#one',
      scope,
    })
    expect(result).toMatchObject({
      ok: true,
      value: {missing: [], points: [target], truncated: false},
    })
    expect(readState).toHaveBeenLastCalledWith({...scope, docId: 'b', unitId: 'two'})
    expect(readState).toHaveBeenCalledTimes(2)
  })
  it('should retain missing targets as diagnostics rather than failing the whole request', async () => {
    const readState = vi
      .fn<KnowledgeIndexWriter['readState']>()
      .mockResolvedValueOnce({ok: true, value: [point]})
      .mockResolvedValueOnce({ok: true, value: []})
    expect(
      await getRelatedKnowledge({index: {readState}, limit: 10, logicalId: 'a', scope}),
    ).toMatchObject({ok: true, value: {missing: [point.payload.relations[0]], points: []}})
  })
  it('should deduplicate repeated targets and cap returned units', async () => {
    const readState = vi
      .fn<KnowledgeIndexWriter['readState']>()
      .mockResolvedValueOnce({ok: true, value: [point, {...point, pointId: 'other'}]})
      .mockResolvedValueOnce({ok: true, value: [point, {...point, pointId: 'two'}]})
    expect(
      await getRelatedKnowledge({index: {readState}, limit: 1, logicalId: 'a', scope}),
    ).toMatchObject({ok: true, value: {points: [point], truncated: true}})
    expect(readState).toHaveBeenCalledTimes(2)
  })
  it('should propagate missing source and storage errors', async () => {
    const readState = vi
      .fn<KnowledgeIndexWriter['readState']>()
      .mockResolvedValueOnce({ok: true, value: []})
    expect(
      await getRelatedKnowledge({index: {readState}, limit: 10, logicalId: 'a', scope}),
    ).toMatchObject({error: {code: 'knowledge-not-found'}, ok: false})
    readState.mockResolvedValueOnce({ok: true, value: [point]}).mockResolvedValueOnce({
      error: {code: 'index-unavailable', detail: 'offline', retryable: true},
      ok: false,
    })
    expect(
      await getRelatedKnowledge({index: {readState}, limit: 10, logicalId: 'a', scope}),
    ).toMatchObject({error: {code: 'index-unavailable'}, ok: false})
  })
})
