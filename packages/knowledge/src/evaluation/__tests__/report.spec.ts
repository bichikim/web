import {describe, expect, it} from 'vitest'
import {createEvaluationReport, parseEvaluationDataset} from '../index'

const dataset = {
  cases: [
    {
      expected: [{docId: 'auth', unitId: 'refresh'}, {docId: 'payment'}],
      id: 'ko',
      query: '인증 갱신',
    },
  ],
  version: 1,
}
const scope = {repoId: 'repo', workspaceId: 'refs/heads/main'}
const hits = [
  {docId: 'other', unitId: 'one'},
  {docId: 'auth', unitId: 'refresh'},
  {docId: 'auth', unitId: 'refresh'},
  {docId: 'payment', unitId: 'refund'},
]
const rankings = [{...scope, hits, id: 'ko'}]

describe('parseEvaluationDataset', () => {
  it('should accept paired document and unit targets', () => {
    expect(parseEvaluationDataset(dataset)).toEqual({ok: true, value: dataset})
  })
  it.each([
    {cases: [], version: 1},
    {...dataset, version: 2},
    {...dataset, cases: [dataset.cases[0], dataset.cases[0]]},
    {...dataset, cases: [{...dataset.cases[0], expected: []}]},
    {
      ...dataset,
      cases: [
        {...dataset.cases[0], expected: [{docId: 'auth'}, {docId: 'auth', unitId: 'refresh'}]},
      ],
    },
    {
      ...dataset,
      cases: [
        {
          ...dataset.cases[0],
          expected: [
            {docId: 'auth', unitId: 'refresh'},
            {docId: 'auth', unitId: 'refresh'},
          ],
        },
      ],
    },
    {...dataset, cases: [{...dataset.cases[0], query: ' '}]},
  ])('should reject invalid or ambiguous datasets', (input) => {
    expect(parseEvaluationDataset(input)).toMatchObject({ok: false})
  })
})

describe('createEvaluationReport', () => {
  it('should calculate cutoff recall and reciprocal rank without duplicate credit', () => {
    const result = createEvaluationReport({cutoff: 3, dataset, rankings})
    expect(result).toMatchObject({
      ok: true,
      value: {comparison: null, summary: {mrr: 0.5, recall: 0.5}},
    })
  })
  it('should give zero for no results', () => {
    expect(
      createEvaluationReport({cutoff: 10, dataset, rankings: [{...rankings[0], hits: []}]}),
    ).toMatchObject({ok: true, value: {summary: {mrr: 0, recall: 0}}})
  })
  it('should flag a deliberately worsened ranking and accept an unchanged report', () => {
    const original = createEvaluationReport({cutoff: 4, dataset, rankings})
    expect(original.ok).toBe(true)
    if (!original.ok) {
      return
    }
    expect(
      createEvaluationReport({baseline: original.value, cutoff: 4, dataset, rankings}),
    ).toMatchObject({ok: true, value: {comparison: {regressions: []}}})
    expect(
      createEvaluationReport({
        baseline: original.value,
        cutoff: 4,
        dataset,
        rankings: [{...rankings[0], hits: [hits[0], hits[0], hits[1]]}],
      }),
    ).toMatchObject({ok: true, value: {comparison: {recallDelta: -0.5, regressions: ['ko']}}})
  })
  it('should reject incompatible or corrupted baselines', () => {
    const original = createEvaluationReport({cutoff: 4, dataset, rankings})
    if (!original.ok) {
      throw new Error('fixture failed')
    }
    for (const baseline of [
      null,
      {...original.value, cutoff: 3},
      {...original.value, datasetHash: '0'.repeat(64)},
      {...original.value, repoId: 'other'},
      {...original.value, summary: {mrr: 1, recall: 1}},
      {...original.value, cases: []},
    ]) {
      expect(createEvaluationReport({baseline, cutoff: 4, dataset, rankings})).toMatchObject({
        ok: false,
      })
    }
  })
  it('should reject invalid cutoff, incomplete results and mixed scopes', () => {
    expect(createEvaluationReport({cutoff: 0, dataset, rankings})).toMatchObject({ok: false})
    expect(createEvaluationReport({cutoff: 1, dataset, rankings: []})).toMatchObject({ok: false})
    const second = {...dataset.cases[0], id: 'en', query: 'refresh token'}
    expect(
      createEvaluationReport({
        cutoff: 1,
        dataset: {...dataset, cases: [...dataset.cases, second]},
        rankings: [...rankings, {...rankings[0], id: 'en', workspaceId: 'other'}],
      }),
    ).toMatchObject({ok: false})
  })
  it('should average cases equally and detect regressions hidden by average gains', () => {
    const two = {
      ...dataset,
      cases: [...dataset.cases, {...dataset.cases[0], id: 'en', query: 'refresh token'}],
    }
    const previous = createEvaluationReport({
      cutoff: 4,
      dataset: two,
      rankings: [rankings[0], {...rankings[0], hits: [], id: 'en'}],
    })
    if (!previous.ok) {
      throw new Error('fixture failed')
    }
    const result = createEvaluationReport({
      baseline: previous.value,
      cutoff: 4,
      dataset: two,
      rankings: [
        {...rankings[0], hits: [hits[0], hits[0], hits[1], hits[3]]},
        {...rankings[0], hits: [hits[1], hits[3]], id: 'en'},
      ],
    })
    expect(result).toMatchObject({
      ok: true,
      value: {comparison: {regressions: ['ko']}, summary: {recall: 1}},
    })
  })
})
