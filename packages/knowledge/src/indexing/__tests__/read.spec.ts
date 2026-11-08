import {describe, expect, it, vi} from 'vitest'
import {getKnowledge, getKnowledgeByIdentity, getKnowledgeStatus} from '..'
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

describe('getKnowledgeByIdentity', () => {
  it('should pass raw identity fields without splitting, decoding or trimming and retain source order', async () => {
    const first = {...point, payload: {...point.payload, startLine: 1}, pointId: 'first'}
    const points = [point, first]
    const index = reader(points)
    expect(
      await getKnowledgeByIdentity({
        identity: {docId: ' docs/C%23#.md ', unitId: ' %23#unit '},
        index,
        scope,
      }),
    ).toEqual({ok: true, value: [first, point]})
    expect(index.readState).toHaveBeenCalledExactlyOnceWith({
      ...scope,
      docId: ' docs/C%23#.md ',
      unitId: ' %23#unit ',
    })
    expect(points).toEqual([point, first])
  })
  it('should omit the unit filter for an entire document', async () => {
    const index = reader([point])
    expect(await getKnowledgeByIdentity({identity: {docId: 'docs/C#.md'}, index, scope})).toEqual({
      ok: true,
      value: [point],
    })
    expect(index.readState).toHaveBeenCalledExactlyOnceWith({...scope, docId: 'docs/C#.md'})
  })
  it.each([{docId: ''}, {docId: ' \t'}, {docId: 'doc', unitId: ''}, {docId: 'doc', unitId: ' \t'}])(
    'should reject blank structured identity %j before reading',
    async (identity) => {
      const index = reader([])
      expect(await getKnowledgeByIdentity({identity, index, scope})).toMatchObject({
        error: {code: 'invalid-knowledge-identity'},
        ok: false,
      })
      expect(index.readState).not.toHaveBeenCalled()
    },
  )
  it('should report a structured not-found selector without a fabricated logical ID', async () => {
    const identity = {docId: 'docs/C#.md', unitId: 'missing'}
    expect(await getKnowledgeByIdentity({identity, index: reader([]), scope})).toEqual({
      error: {code: 'knowledge-not-found', selector: identity},
      ok: false,
    })
  })
  it('should propagate storage failure', async () => {
    const error = {code: 'index-unavailable', detail: 'offline', retryable: true} as const
    const index = {readState: vi.fn(async () => ({error, ok: false as const}))}
    expect(await getKnowledgeByIdentity({identity: {docId: 'docs/C#.md'}, index, scope})).toEqual({
      error,
      ok: false,
    })
  })
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
    const index = reader(points)
    expect(await getKnowledge({index, logicalId: 'auth/session', scope})).toEqual({
      ok: true,
      value: [first, point],
    })
    expect(index.readState).toHaveBeenCalledExactlyOnceWith({...scope, docId: 'auth/session'})
    expect(points).toEqual([point, first])
  })
  it.each([
    '',
    ' \t',
    '#unit',
    ' \t#unit',
    'doc#',
    'doc# ',
    'doc#\t\n',
    'doc#\u00a0\u3000',
    'doc#unit#extra',
  ])('should reject malformed logical ID %s before reading', async (logicalId) => {
    const index = reader([])
    expect(await getKnowledge({index, logicalId, scope})).toMatchObject({
      error: {code: 'invalid-logical-id'},
      ok: false,
    })
    expect(index.readState).not.toHaveBeenCalled()
  })
  it('should preserve nonblank document and unit IDs without trimming', async () => {
    const index = reader([point])
    expect(await getKnowledge({index, logicalId: ' auth/session # refresh ', scope})).toEqual({
      ok: true,
      value: [point],
    })
    expect(index.readState).toHaveBeenCalledExactlyOnceWith({
      ...scope,
      docId: ' auth/session ',
      unitId: ' refresh ',
    })
  })
  it('should return a distinct not-found result with the original ID', async () => {
    const logicalId = 'missing# unit '
    expect(await getKnowledge({index: reader([]), logicalId, scope})).toEqual({
      error: {code: 'knowledge-not-found', logicalId},
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
