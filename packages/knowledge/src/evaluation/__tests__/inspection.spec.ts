import {expect, it} from 'vitest'
import {createInspectionEvaluation} from '../index'
const target = (docId: string) => ({
  contentHash: `sha256:${docId.repeat(64)}`,
  docId,
  unitId: 'main',
})
const dataset = {
  cases: [
    {expected: 'duplicate', id: 'duplicate', left: target('a'), right: target('b')},
    {expected: 'conflict', id: 'conflict', left: target('a'), right: target('c')},
    {expected: 'unrelated', id: 'unrelated', left: target('b'), right: target('c')},
    {expected: 'uncertain', id: 'uncertain', left: target('a'), right: target('d')},
  ],
  kind: 'draft',
  repoId: 'repo',
  version: 1,
  workspaceId: 'main',
}
const diagnostic = {
  command: 'doctor',
  healthy: true,
  semantic: {
    assessments: [
      {assessment: {kind: 'duplicate'}, left: target('b'), right: target('a')},
      {assessment: {kind: 'unrelated'}, left: target('a'), right: target('c')},
    ],
    errors: [],
    limit: 10,
    model: {digest: 'a'.repeat(64), name: 'test'},
    promptVersion: 1,
    repoId: 'repo',
    retrieval: {candidatePairs: 2, errors: [], neighborsPerUnit: 10, seedLimit: 20},
    selectedPairs: 2,
    sourceUnits: ['a', 'b', 'c', 'd'].map(target),
    status: 'complete',
    workspaceId: 'main',
  },
}
const approved = {
  accepted: ['duplicate', 'uncertain'],
  note: 'Both readings are valid.',
  reviewedAt: '2026-09-07T00:00:00Z',
  reviewer: 'user',
  status: 'approved',
}
const reviewed = {
  cases: dataset.cases.map(({expected, ...entry}, index) => ({
    ...entry,
    proposal: expected,
    review: index === 0 ? approved : {status: 'unreviewed'},
  })),
  kind: 'reviewed',
  repoId: dataset.repoId,
  version: 2,
  workspaceId: dataset.workspaceId,
}
it.each(['duplicate', 'uncertain'])(
  'should accept each approved answer and exclude all unreviewed cases: %s',
  (kind) => {
    const input = {
      ...diagnostic,
      semantic: {
        ...diagnostic.semantic,
        assessments: [
          {...diagnostic.semantic.assessments[0], assessment: {kind}},
          diagnostic.semantic.assessments[1],
        ],
      },
    }
    expect(createInspectionEvaluation({dataset: reviewed, diagnostic: input})).toMatchObject({
      ok: true,
      value: {
        cases: [
          {outcome: 'correct'},
          {outcome: 'excluded'},
          {outcome: 'excluded'},
          {outcome: 'excluded'},
        ],
        provisional: false,
        summary: {
          approvedCases: 1,
          candidateSelectionRecall: null,
          classificationAccuracy: 1,
          classified: 1,
          correct: 1,
          excludedCases: 3,
          positivePairs: 0,
          unlabelledAssessments: 1,
        },
        version: 2,
      },
    })
  },
)
it('should exclude tentative and commented cases without treating proposed answers as approved', () => {
  const input = {
    ...reviewed,
    cases: reviewed.cases.map((entry, index) => ({
      ...entry,
      review:
        index === 0
          ? {note: 'Probably right.', status: 'tentative'}
          : index === 1
            ? {note: 'Depends on context.', status: 'commented'}
            : {status: 'unreviewed'},
    })),
  }
  expect(createInspectionEvaluation({dataset: input, diagnostic})).toMatchObject({
    ok: true,
    value: {
      summary: {
        approvedCases: 0,
        classificationAccuracy: null,
        classified: 0,
        correct: 0,
        excludedCases: 4,
        unlabelledAssessments: 2,
      },
    },
  })
})
it.each([
  {...approved, accepted: []},
  {...approved, accepted: ['conflict', 'conflict']},
  {...approved, accepted: ['unknown']},
  {...approved, reviewer: ' '},
  {...approved, reviewedAt: 'invalid'},
  {accepted: ['conflict'], status: 'unreviewed'},
  {status: 'tentative'},
  {note: '', status: 'commented'},
])('should reject invalid review contracts: %j', (review) => {
  expect(
    createInspectionEvaluation({
      dataset: {...reviewed, cases: [{...reviewed.cases[0], review}]},
      diagnostic,
    }),
  ).toMatchObject({error: {code: 'invalid-inspection-dataset'}, ok: false})
})
it('should compare multiple-answer baselines, ignore excluded cases, and reject changed approvals', () => {
  const baseline = createInspectionEvaluation({dataset: reviewed, diagnostic})
  expect(baseline.ok).toBe(true)
  if (!baseline.ok) {
    throw new Error('Expected baseline')
  }
  const changed = {
    ...diagnostic,
    semantic: {
      ...diagnostic.semantic,
      assessments: [{...diagnostic.semantic.assessments[0], assessment: {kind: 'uncertain'}}],
      selectedPairs: 1,
    },
  }
  const reordered = {
    ...reviewed,
    cases: [
      {...reviewed.cases[0], review: {...approved, accepted: ['uncertain', 'duplicate']}},
      ...reviewed.cases.slice(1),
    ],
  }
  expect(
    createInspectionEvaluation({baseline: baseline.value, dataset: reordered, diagnostic: changed}),
  ).toMatchObject({ok: true, value: {comparison: {regressions: []}}})
  const wrong = {
    ...diagnostic,
    semantic: {
      ...diagnostic.semantic,
      assessments: [
        {...diagnostic.semantic.assessments[0], assessment: {kind: 'conflict'}},
        diagnostic.semantic.assessments[1],
      ],
    },
  }
  expect(
    createInspectionEvaluation({baseline: baseline.value, dataset: reviewed, diagnostic: wrong}),
  ).toMatchObject({ok: true, value: {comparison: {regressions: ['duplicate']}}})
  expect(
    createInspectionEvaluation({
      baseline: baseline.value,
      dataset: {
        ...reviewed,
        cases: [
          {
            ...reviewed.cases[0],
            review: {...approved, accepted: ['conflict']},
          },
          ...reviewed.cases.slice(1),
        ],
      },
      diagnostic,
    }),
  ).toMatchObject({error: {code: 'invalid-inspection-baseline'}, ok: false})
})
it('should separate missing candidates from misclassification and mark draft scores provisional', () => {
  expect(createInspectionEvaluation({dataset, diagnostic})).toMatchObject({
    ok: true,
    value: {
      cases: [
        {id: 'duplicate', outcome: 'correct'},
        {id: 'conflict', outcome: 'misclassified'},
        {id: 'unrelated', outcome: 'not-selected'},
        {id: 'uncertain', outcome: 'not-selected'},
      ],
      provisional: true,
      summary: {
        candidateSelectionRecall: 1,
        classificationAccuracy: 0.5,
        classified: 2,
        correct: 1,
        positivePairs: 2,
        selectedPositivePairs: 2,
      },
    },
  })
})
it('should return null accuracy with no selected labels and count positive misses', () => {
  const input = {
    ...diagnostic,
    semantic: {...diagnostic.semantic, assessments: [], selectedPairs: 0},
  }
  expect(createInspectionEvaluation({dataset, diagnostic: input})).toMatchObject({
    ok: true,
    value: {summary: {candidateSelectionRecall: 0, classificationAccuracy: null, classified: 0}},
  })
})
it.each([
  {...diagnostic, healthy: false},
  {...diagnostic, semantic: {...diagnostic.semantic, status: 'partial'}},
  {...diagnostic, semantic: {...diagnostic.semantic, repoId: 'other'}},
  {...diagnostic, semantic: {...diagnostic.semantic, sourceUnits: [target('a')]}},
  {...diagnostic, semantic: {...diagnostic.semantic, selectedPairs: 1}},
  {...diagnostic, semantic: {...diagnostic.semantic, errors: [{code: 'failed'}]}},
  {...diagnostic, semantic: {...diagnostic.semantic, workspaceId: 'other'}},
  {...diagnostic, semantic: {...diagnostic.semantic, model: undefined}},
  {
    ...diagnostic,
    semantic: {
      ...diagnostic.semantic,
      assessments: [diagnostic.semantic.assessments[0], diagnostic.semantic.assessments[0]],
    },
  },
  {
    ...diagnostic,
    semantic: {
      ...diagnostic.semantic,
      sourceUnits: diagnostic.semantic.sourceUnits.map((entry) => ({
        ...entry,
        contentHash: `sha256:${'f'.repeat(64)}`,
      })),
    },
  },
])('should reject incomplete, inconsistent or mismatched diagnostic input', (input) => {
  expect(createInspectionEvaluation({dataset, diagnostic: input})).toMatchObject({ok: false})
})
it.each([
  {reviewedAt: '2026-09-06T00:00:00Z', reviewer: ' '},
  {reviewedAt: 'not a date', reviewer: 'human fixture'},
])('should reject empty reviewers and invalid review timestamps', (review) => {
  expect(
    createInspectionEvaluation({dataset: {...dataset, kind: 'golden', review}, diagnostic}),
  ).toMatchObject({error: {code: 'invalid-inspection-dataset'}, ok: false})
})
it('should reject duplicate unordered labels and golden files without review metadata', () => {
  expect(
    createInspectionEvaluation({
      dataset: {
        ...dataset,
        cases: [
          ...dataset.cases,
          {...dataset.cases[0], id: 'reverse', left: target('b'), right: target('a')},
        ],
      },
      diagnostic,
    }),
  ).toMatchObject({ok: false})
  expect(
    createInspectionEvaluation({dataset: {...dataset, kind: 'golden'}, diagnostic}),
  ).toMatchObject({ok: false})
})
it('should compare compatible runs, detect lost correct answers and reject changed source or budgets', () => {
  const baseline = createInspectionEvaluation({dataset, diagnostic})
  expect(baseline.ok).toBe(true)
  if (!baseline.ok) {
    return
  }
  const worse = {
    ...diagnostic,
    semantic: {...diagnostic.semantic, assessments: [], selectedPairs: 0},
  }
  expect(
    createInspectionEvaluation({baseline: baseline.value, dataset, diagnostic: worse}),
  ).toMatchObject({ok: true, value: {comparison: {regressions: ['duplicate', 'conflict']}}})
  expect(
    createInspectionEvaluation({
      baseline: baseline.value,
      dataset,
      diagnostic: {...diagnostic, semantic: {...diagnostic.semantic, limit: 1}},
    }),
  ).toMatchObject({ok: false})
  expect(
    createInspectionEvaluation({baseline: {...baseline.value, summary: {}}, dataset, diagnostic}),
  ).toMatchObject({ok: false})
})
it('should accept reviewed labels, compare model changes and ignore JSON property ordering', () => {
  const golden = {
    ...dataset,
    kind: 'golden',
    review: {reviewedAt: '2026-09-06T00:00:00Z', reviewer: 'human fixture'},
  }
  const baseline = createInspectionEvaluation({dataset: golden, diagnostic})
  expect(baseline).toMatchObject({ok: true, value: {provisional: false}})
  if (!baseline.ok) {
    throw new Error('fixture failed')
  }
  const reordered = {
    ...baseline.value,
    summary: Object.fromEntries(Object.entries(baseline.value.summary).reverse()),
  }
  const changed = {
    ...diagnostic,
    semantic: {
      ...diagnostic.semantic,
      model: {digest: 'b'.repeat(64), name: 'other'},
      promptVersion: 2,
    },
  }
  expect(
    createInspectionEvaluation({baseline: reordered, dataset: golden, diagnostic: changed}),
  ).toMatchObject({ok: true, value: {comparison: {regressions: []}}})
  expect(createInspectionEvaluation({baseline: baseline.value, dataset, diagnostic})).toMatchObject(
    {ok: false},
  )
})
it('should reject changed sources and retrieval budgets against a compatible baseline', () => {
  const baseline = createInspectionEvaluation({dataset, diagnostic})
  if (!baseline.ok) {
    throw new Error('fixture failed')
  }
  const changed = {
    ...diagnostic,
    semantic: {
      ...diagnostic.semantic,
      sourceUnits: [...diagnostic.semantic.sourceUnits, target('e')],
    },
  }
  expect(
    createInspectionEvaluation({baseline: baseline.value, dataset, diagnostic: changed}),
  ).toMatchObject({error: {code: 'invalid-inspection-baseline'}, ok: false})
  const budget = {...diagnostic, semantic: {...diagnostic.semantic, limit: 20}}
  expect(
    createInspectionEvaluation({baseline: baseline.value, dataset, diagnostic: budget}),
  ).toMatchObject({error: {code: 'invalid-inspection-baseline'}, ok: false})
})
it('should report no positive denominator and count unlabelled assessments', () => {
  const negative = {...dataset, cases: [dataset.cases[2]]}
  expect(createInspectionEvaluation({dataset: negative, diagnostic})).toMatchObject({
    ok: true,
    value: {
      summary: {
        candidateSelectionRecall: null,
        classificationAccuracy: null,
        unlabelledAssessments: 2,
      },
    },
  })
})
