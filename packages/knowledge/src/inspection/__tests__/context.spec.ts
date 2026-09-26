import {expect, it} from 'vitest'
import {
  collectInspectionContext,
  contextualKey,
  parseContextualReview,
  selectInspectionContext,
} from '../context'
import type {StoredKnowledgePoint} from '../../indexing/store'
const point = (id: string, docId = id): StoredKnowledgePoint => ({
  payload: {
    contentHash: id,
    docId,
    path: `${docId}.md`,
    relations: [],
    repoId: 'repo',
    status: 'active',
    tags: [],
    text: `Rule ${id}`,
    title: id,
    type: 'rule',
    unitId: id,
    workspaceId: 'main',
  },
  pointId: id,
})
const left = point('a', 'policy')
const right = point('b')
const pair = {left, right}
it('should validate cached context provenance and reject altered or unsupported reviews', () => {
  const initial = {
    confidence: 0.5,
    kind: 'uncertain',
    leftQuote: '',
    reason: 'Scope missing.',
    rightQuote: '',
  }
  const points = [point('c')]
  const questions = ['Scope?']
  const review = {
    citations: ['context-1-left-1'],
    initial,
    proposed: initial,
    questions,
    selection: selectInspectionContext({points, questions}),
    unresolved: [],
  }
  expect(parseContextualReview({assessment: initial, pair, points, review})).toMatchObject({
    ok: true,
  })
  for (const changed of [
    undefined,
    {...review, initial: {}},
    {...review, selection: {}},
    {...review, citations: ['context-1-left-1', 'context-1-left-1']},
    {...review, questions: ['Scope?', 'Scope?']},
    {...review, unresolved: ['Other?']},
    {...review, citations: []},
  ]) {
    expect(
      parseContextualReview({assessment: initial, pair, points, review: changed}),
    ).toMatchObject({ok: false})
  }
  expect(parseContextualReview({assessment: {}, pair, points, review})).toMatchObject({ok: false})
  expect(parseContextualReview({assessment: initial, pair, points: [], review})).toMatchObject({
    ok: false,
  })
})
it('should preserve exact prefixes at surrogate boundaries and cap the combined text budget', () => {
  const points = Array.from({length: 6}, (_, index) => ({
    ...point(String(index)),
    payload: {...point(String(index)).payload, text: `${'x'.repeat(3999)}😀tail`},
  }))
  const selection = selectInspectionContext({points, questions: ['tail']})
  expect(selection.sources[0].text).toBe('x'.repeat(3999))
  expect(
    selection.sources.reduce((total, source) => total + source.text.length, 0),
  ).toBeLessThanOrEqual(12000)
  expect(selection.truncated).toBe(true)
})
it('should collect same-document and direct linked sources only within the active scope', () => {
  const linked = point('linked')
  const input = {
    ...left,
    payload: {...left.payload, relations: [{targetDocId: 'linked', type: 'links-to' as const}]},
  }
  const same = point('definition', 'policy')
  const foreign = {...same, payload: {...same.payload, workspaceId: 'other'}, pointId: 'foreign'}
  const inactive = {
    ...same,
    payload: {...same.payload, status: 'deprecated' as const},
    pointId: 'inactive',
  }
  expect(
    collectInspectionContext({
      pair: {left: input, right},
      points: [input, right, same, linked, foreign, inactive, point('unrelated')],
    }),
  ).toEqual([same, linked])
})
it('should rank question matches and expose count and text truncation deterministically', () => {
  const long = {
    ...point('z'),
    payload: {...point('z').payload, text: `exception ${'x'.repeat(5000)}`},
  }
  const selection = selectInspectionContext({points: [point('a'), long], questions: ['exception']})
  expect(selection.sources[0]).toMatchObject({pointId: 'z', truncated: true})
  expect(selection.sources[0].text.length).toBeLessThanOrEqual(4000)
  expect(
    selectInspectionContext({
      points: Array.from({length: 20}, (_, i) => point(String(i))),
      questions: ['rule'],
    }),
  ).toMatchObject({eligible: 20, sources: expect.any(Array), truncated: true})
  expect(selectInspectionContext({points: [long, point('a')], questions: ['exception']})).toEqual(
    selection,
  )
})
it('should invalidate contextual caches for supporting text and relation changes but not input order', () => {
  const model = {digest: 'digest', name: 'model'}
  const points = [point('c'), point('d')]
  const key = contextualKey({model, pair, points})
  expect(contextualKey({model, pair, points: points.toReversed()})).toBe(key)
  expect(contextualKey({model, pair, points: [point('c')]})).not.toBe(key)
  expect(
    contextualKey({
      model,
      pair,
      points: [{...points[0], payload: {...points[0].payload, text: 'new'}}],
    }),
  ).not.toBe(key)
})
