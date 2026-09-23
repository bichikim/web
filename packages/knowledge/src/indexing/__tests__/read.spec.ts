import {describe, expect, it, vi} from 'vitest'
import {getKnowledge, getKnowledgeStatus} from '../read'
import type {KnowledgeIndexWriter, StoredKnowledgePoint} from '../store'

const scope = {repoId: 'test/repo', workspaceId: 'refs/heads/main'}
const point: StoredKnowledgePoint = {
  payload: {
    ...scope,
    contentHash: 'hash',
    docId: 'auth/session',
    path: 'auth.md',
    relations: [],
    startLine: 10,
    status: 'active',
    tags: [],
    text: 'Refresh tokens',
    title: 'Refresh',
    type: 'rule',
    unitId: 'refresh',
  },
  pointId: 'one',
}
const reader = (points: ReadonlyArray<StoredKnowledgePoint>) => ({
  readState: vi.fn<KnowledgeIndexWriter['readState']>(async () => ({ok: true, value: points})),
})

describe('getKnowledge', () => {
  it('should retrieve an exact unit within the selected scope', async () => {
    const index = reader([point])
    expect(await getKnowledge({index, logicalId: 'auth/session#refresh', scope})).toEqual({
      ok: true,
      value: [point],
    })
    expect(index.readState).toHaveBeenCalledWith({
      ...scope,
      docId: 'auth/session',
      unitId: 'refresh',
    })
  })
  it('should return all document units in source order without mutating the stored array', async () => {
    const first = {
      ...point,
      payload: {...point.payload, startLine: 1, unitId: 'intro'},
      pointId: 'two',
    }
    const points = [point, first]
    expect(await getKnowledge({index: reader(points), logicalId: 'auth/session', scope})).toEqual({
      ok: true,
      value: [first, point],
    })
    expect(points).toEqual([point, first])
  })
  it.each(['', '#unit', 'doc#', 'doc#unit#extra'])(
    'should reject malformed logical ID %s before reading',
    async (logicalId) => {
      const index = reader([])
      expect(await getKnowledge({index, logicalId, scope})).toMatchObject({
        error: {code: 'invalid-logical-id'},
        ok: false,
      })
      expect(index.readState).not.toHaveBeenCalled()
    },
  )
  it('should return a distinct not-found result for an absent ID', async () => {
    expect(await getKnowledge({index: reader([]), logicalId: 'missing', scope})).toMatchObject({
      error: {code: 'knowledge-not-found'},
      ok: false,
    })
  })
  it('should propagate storage failure', async () => {
    const error = {code: 'index-unavailable', detail: 'offline', retryable: true} as const
    const index = {readState: vi.fn(async () => ({error, ok: false as const}))}
    expect(await getKnowledge({index, logicalId: 'doc', scope})).toEqual({error, ok: false})
  })
})

describe('getKnowledgeStatus', () => {
  it('should count unique documents and units by status in the selected scope', async () => {
    const index = reader([
      point,
      {...point, payload: {...point.payload, status: 'deprecated', unitId: 'old'}, pointId: 'two'},
    ])
    expect(await getKnowledgeStatus({index, scope})).toEqual({
      ok: true,
      value: {
        documents: 1,
        statuses: {active: 1, conflicting: 0, deprecated: 1, superseded: 0},
        units: 2,
      },
    })
    expect(index.readState).toHaveBeenCalledWith(scope)
  })
  it('should report an empty scope with zero counts', async () => {
    expect(await getKnowledgeStatus({index: reader([]), scope})).toMatchObject({
      ok: true,
      value: {documents: 0, units: 0},
    })
  })
  it('should not turn unavailable storage into empty status', async () => {
    const error = {code: 'index-unavailable', detail: 'offline', retryable: true} as const
    const index = {readState: vi.fn(async () => ({error, ok: false as const}))}
    expect(await getKnowledgeStatus({index, scope})).toEqual({error, ok: false})
  })
})
