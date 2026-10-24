import {expect, it, vi} from 'vitest'
import {runInspectionResearch} from '../research'
import type {StoredKnowledgePoint} from '../../indexing/store'
const point = (id: string, text = `Rule ${id}`): StoredKnowledgePoint => ({
  payload: {
    contentHash: id,
    docId: id,
    path: `${id}.md`,
    relations: [],
    repoId: 'repo',
    status: 'active',
    tags: [],
    text,
    title: id,
    type: 'rule',
    unitId: 'main',
    workspaceId: 'main',
  },
  pointId: id,
})
const pair = {left: point('a'), right: point('b')}
const initial = {
  confidence: 0.5,
  kind: 'uncertain' as const,
  leftQuote: '',
  reason: 'Which storage scope?',
  rightQuote: '',
}
const resolved = {
  confidence: 0.8,
  kind: 'unrelated' as const,
  leftQuote: '',
  reason: 'Explicit exception.',
  rightQuote: '',
}
const make = () => ({
  assessor: vi.fn().mockResolvedValue({
    ok: true,
    value: {citations: ['context-1-left-1'], proposed: resolved, unresolved: []},
  }),
  initial,
  pair,
  planner: vi.fn().mockResolvedValue({ok: true, value: ['storage scope']}),
  points: [pair.left, pair.right, point('c'), point('d')],
  questions: ['Scope?'],
  reader: {search: vi.fn().mockResolvedValue({ok: true, value: [{...point('c'), score: 1}]})},
})
it('should reject malformed initial input before using linked evidence', async () => {
  const input = make()
  expect(await runInspectionResearch({...input, questions: ['']})).toMatchObject({ok: false})
  expect(
    await runInspectionResearch({...input, initial: {...initial, confidence: 2}}),
  ).toMatchObject({ok: false})
  expect(input.planner).not.toHaveBeenCalled()
})
it('should propagate planner and assessor failures including during linked evidence review', async () => {
  const input = make()
  const failure = {error: {code: 'offline'}, ok: false}
  input.planner.mockResolvedValueOnce(failure)
  expect(await runInspectionResearch(input)).toEqual(failure)
  input.assessor.mockResolvedValue(failure)
  expect(await runInspectionResearch(input)).toEqual(failure)
  expect(await runInspectionResearch({...input, linked: [point('c')]})).toEqual(failure)
})
it('should resolve on the final round and keep uncertain proposals unresolved without supplied questions', async () => {
  const input = make()
  input.planner
    .mockResolvedValueOnce({ok: true, value: ['scope']})
    .mockResolvedValue({ok: true, value: ['priority']})
  input.reader.search
    .mockResolvedValueOnce({ok: true, value: [{...point('c'), score: 1}]})
    .mockResolvedValue({ok: true, value: [{...point('d'), score: 1}]})
  input.assessor.mockResolvedValueOnce({
    ok: true,
    value: {citations: ['context-1-left-1'], proposed: initial, unresolved: []},
  })
  expect(await runInspectionResearch(input)).toMatchObject({
    ok: true,
    research: {rounds: [{decision: {unresolved: [initial.reason]}}, {}], stop: 'resolved'},
  })
})
it('should search the knowledge base and stop after resolving the missing condition', async () => {
  const input = make()
  expect(await runInspectionResearch(input)).toMatchObject({
    ok: true,
    research: {rounds: [{queries: [{hits: ['c'], query: 'storage scope'}]}], stop: 'resolved'},
    value: resolved,
  })
  expect(input.reader.search).toHaveBeenCalledWith({limit: 3, query: 'storage scope'})
  expect(input.planner).toHaveBeenCalledTimes(1)
})
it('should reassess linked evidence before searching even when the initial pair appears resolved', async () => {
  const input = make()
  const result = await runInspectionResearch({
    ...input,
    initial: resolved,
    linked: [point('c')],
    questions: [],
  })
  expect(result).toMatchObject({
    ok: true,
    research: {
      reused: {added: ['c'], decision: {citations: ['context-1-left-1']}},
      rounds: [],
      stop: 'resolved',
    },
  })
  expect(input.assessor).toHaveBeenCalledTimes(1)
  expect(input.reader.search).not.toHaveBeenCalled()
  expect(input.planner).not.toHaveBeenCalled()
})
it('should search only after linked evidence leaves unresolved conditions and deduplicate reused sources', async () => {
  const input = make()
  input.assessor.mockResolvedValueOnce({
    ok: true,
    value: {citations: ['context-1-left-1'], proposed: initial, unresolved: ['Priority?']},
  })
  input.reader.search.mockResolvedValue({
    ok: true,
    value: [
      {...point('c'), score: 1},
      {...point('d'), score: 0.8},
    ],
  })
  const result = await runInspectionResearch({...input, linked: [point('c')]})
  expect(result).toMatchObject({
    ok: true,
    research: {reused: {added: ['c']}, rounds: [{added: ['d']}], stop: 'resolved'},
  })
  expect(input.planner.mock.calls[0][0]).toMatchObject({questions: ['Priority?']})
  expect(
    input.assessor.mock.calls[1][0].selection.sources.map(
      (source: {pointId: string}) => source.pointId,
    ),
  ).toEqual(['c', 'd'])
})
it('should exclude changed foreign inactive original and duplicate linked sources', async () => {
  const input = make()
  const inactive = {...point('x'), payload: {...point('x').payload, status: 'deprecated' as const}}
  const foreign = {...point('y'), payload: {...point('y').payload, workspaceId: 'other'}}
  input.points.push(inactive, foreign)
  const result = await runInspectionResearch({
    ...input,
    linked: [point('c', 'Changed'), pair.left, inactive, foreign, point('c'), point('c')],
  })
  expect(result).toMatchObject({ok: true, research: {reused: {added: ['c']}}})
  expect(input.assessor.mock.calls[0][0].selection.sources).toHaveLength(1)
})
it('should count reused text against the cumulative budget and reject an invalid reuse decision', async () => {
  const input = make()
  const linked = ['c', 'd', 'e'].map((id) => point(id, id.repeat(5000)))
  input.points = [...input.points.slice(0, 2), ...linked]
  input.assessor.mockResolvedValue({
    ok: true,
    value: {citations: [], proposed: initial, unresolved: ['Scope?']},
  })
  expect(await runInspectionResearch({...input, linked})).toMatchObject({
    ok: true,
    research: {rounds: [], stop: 'text-limit'},
  })
  expect(input.reader.search).not.toHaveBeenCalled()
  input.assessor.mockResolvedValue({
    ok: true,
    value: {citations: ['invented'], proposed: resolved, unresolved: []},
  })
  expect(await runInspectionResearch({...input, linked})).toMatchObject({
    error: {code: 'invalid-inspection-research'},
    ok: false,
  })
})
it('should use newly discovered missing conditions in the second round and never exceed two rounds', async () => {
  const input = make()
  input.planner
    .mockResolvedValueOnce({ok: true, value: ['storage scope']})
    .mockResolvedValue({ok: true, value: ['policy priority']})
  input.reader.search
    .mockResolvedValueOnce({ok: true, value: [{...point('c'), score: 1}]})
    .mockResolvedValue({ok: true, value: [{...point('d'), score: 1}]})
  input.assessor.mockResolvedValue({
    ok: true,
    value: {citations: [], proposed: resolved, unresolved: ['Priority?']},
  })
  expect(await runInspectionResearch(input)).toMatchObject({
    ok: true,
    research: {rounds: [{}, {}], stop: 'round-limit', unresolved: ['Priority?']},
    value: {kind: 'uncertain'},
  })
  expect(input.planner.mock.calls[1][0]).toMatchObject({questions: ['Priority?']})
  expect(input.reader.search).toHaveBeenCalledTimes(2)
})
it('should stop on repeated queries or absence of new source text without reclassifying', async () => {
  const input = make()
  input.assessor.mockResolvedValue({
    ok: true,
    value: {citations: [], proposed: initial, unresolved: ['Scope?']},
  })
  expect(await runInspectionResearch(input)).toMatchObject({
    ok: true,
    research: {stop: 'no-new-queries'},
  })
  input.reader.search.mockResolvedValue({ok: true, value: [{...pair.left, score: 1}]})
  input.assessor.mockClear()
  expect(await runInspectionResearch(input)).toMatchObject({
    ok: true,
    research: {stop: 'no-new-queries'},
  })
  expect(input.assessor).not.toHaveBeenCalled()
})
it('should enforce query and result limits', async () => {
  const input = make()
  input.planner.mockResolvedValue({ok: true, value: ['one', 'two', 'three', 'four']})
  expect(await runInspectionResearch(input)).toMatchObject({ok: false})
  expect(input.reader.search).not.toHaveBeenCalled()
  input.planner.mockResolvedValue({ok: true, value: ['one', 'two', 'three']})
  input.reader.search.mockResolvedValue({
    ok: true,
    value: Array.from({length: 4}, () => ({...point('c'), score: 1})),
  })
  expect(await runInspectionResearch(input)).toMatchObject({ok: false})
})
it('should distinguish search failures and changed or foreign sources from absent evidence', async () => {
  const input = make()
  for (const result of [
    {error: {code: 'offline'}, ok: false},
    {
      ok: true,
      value: [{...point('c'), payload: {...point('c').payload, workspaceId: 'foreign'}, score: 1}],
    },
    {ok: true, value: [{...point('c', 'Changed'), score: 1}]},
  ]) {
    input.reader.search.mockResolvedValue(result)
    // eslint-disable-next-line no-await-in-loop -- Each response owns the same reader mock.
    expect(await runInspectionResearch(input)).toMatchObject({ok: false})
  }
  expect(input.assessor).not.toHaveBeenCalled()
})
it('should bound all added text to 12000 characters and record budget exhaustion', async () => {
  const input = make()
  const points = ['c', 'd', 'e'].map((id) => point(id, id.repeat(5000)))
  input.points = [pair.left, pair.right, ...points]
  input.reader.search.mockResolvedValue({ok: true, value: points.map((p) => ({...p, score: 1}))})
  input.assessor.mockResolvedValue({
    ok: true,
    value: {citations: [], proposed: initial, unresolved: ['Scope?']},
  })
  const result = await runInspectionResearch(input)
  expect(result).toMatchObject({ok: true, research: {stop: 'text-limit'}})
  if (result.ok) {
    expect(
      result.research.selection.sources.reduce((total, source) => total + source.text.length, 0),
    ).toBe(12000)
  }
})
it('should ignore known inactive hits and deduplicate identical text across documents', async () => {
  const input = make()
  const inactive = {...point('x'), payload: {...point('x').payload, status: 'deprecated' as const}}
  input.points = [...input.points, inactive]
  input.reader.search.mockResolvedValue({ok: true, value: [{...inactive, score: 1}]})
  expect(await runInspectionResearch(input)).toMatchObject({
    ok: true,
    research: {stop: 'no-new-queries'},
  })
  const duplicate = point('d', point('c').payload.text)
  input.points = [pair.left, pair.right, point('c'), duplicate]
  input.reader.search.mockResolvedValue({
    ok: true,
    value: [
      {...point('c'), score: 1},
      {...duplicate, score: 0.5},
    ],
  })
  const result = await runInspectionResearch(input)
  expect(result).toMatchObject({ok: true, research: {stop: 'resolved'}})
  if (result.ok) {
    expect(result.research.selection.sources).toHaveLength(1)
  }
})
it('should stop without requests when resolved and reject invalid citations or changed conclusions', async () => {
  const input = make()
  expect(await runInspectionResearch({...input, initial: resolved, questions: []})).toMatchObject({
    ok: true,
    research: {stop: 'resolved'},
  })
  expect(input.planner).not.toHaveBeenCalled()
  input.assessor.mockResolvedValue({
    ok: true,
    value: {citations: ['invented'], proposed: resolved, unresolved: []},
  })
  expect(await runInspectionResearch(input)).toMatchObject({ok: false})
  input.planner.mockRejectedValue(new Error('offline'))
  expect(await runInspectionResearch(input)).toMatchObject({
    error: {code: 'inspection-research-unavailable'},
    ok: false,
  })
})
