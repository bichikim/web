import {expect, it, vi} from 'vitest'
import type {StoredKnowledgePoint} from '../../indexing/store'
import type {InquiryAuditOptions, InquiryAuditSuccess} from '../audit'
import {
  type InquiryAssessOptions,
  type InquiryDecisionSuccess,
  type InquiryPlanOptions,
  runInquiryResearch,
} from '../inquiry'

const point = (id: string): StoredKnowledgePoint => ({
  payload: {
    contentHash: id,
    docId: id,
    path: `${id}.md`,
    relations: [],
    repoId: 'repo',
    status: 'active',
    tags: [],
    text: `Evidence ${id}`,
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
  reason: 'Missing scope.',
  rightQuote: '',
}
const make = () => ({
  assessor: vi.fn(
    async (input: InquiryAssessOptions): Promise<InquiryDecisionSuccess> => ({
      ok: true as const,
      value: {
        findings: input.inquiries.map((q) => ({
          citations: ['context-1-left-1'],
          confirmed: 'C describes storage.',
          questionId: q.id,
          remaining: 'The exception is not defined.',
        })),
        proposed: initial,
      },
    }),
  ),
  initial,
  pair,
  planner: vi.fn(async (input: InquiryPlanOptions) => ({
    ok: true as const,
    value: input.inquiries.map((q) => ({query: 'playlist scope', questionId: q.id})),
  })),
  points: [pair.left, pair.right, point('c')],
  questions: ['Does the contract cover playlists?'],
  reader: {search: vi.fn().mockResolvedValue({ok: true, value: [{...point('c'), score: 1}]})},
})
const close = async (input: InquiryAssessOptions): Promise<InquiryDecisionSuccess> => ({
  ok: true,
  value: {
    findings: input.inquiries.map((question) => ({
      citations: ['context-1-left-1'],
      confirmed: 'C defines the policy.',
      questionId: question.id,
      remaining: '',
    })),
    proposed: {...initial, kind: 'unrelated'},
  },
})
const reject = async (input: InquiryAuditOptions): Promise<InquiryAuditSuccess> => ({
  ok: true,
  value: input.questions.map((question) => ({
    evidence: [],
    missing: 'Does this policy apply to playlists?',
    questionId: question.id,
    reason: 'The answer only repeats policies.',
    supported: false,
  })),
})
it('should preserve both checks and never close a question rejected by independent evidence review', async () => {
  const input = make()
  input.assessor.mockImplementation(close)
  input.reader.search.mockResolvedValue({ok: true, value: []})
  const auditor = async (state: InquiryAuditOptions) => {
    const evidence = (await reject(state)).value
    const answers = evidence.map((finding) => ({
      ...finding,
      evidence: [state.questions[0].evidence[0].id],
      missing: '',
      supported: true,
    }))
    return {checks: {answers, evidence}, ok: true as const, value: answers}
  }
  expect(await runInquiryResearch({...input, auditor, linked: [point('c')]})).toMatchObject({
    ok: true,
    research: {
      reused: {
        decision: {
          audits: [
            {checks: {answers: {supported: true}, evidence: {supported: false}}, supported: false},
          ],
        },
      },
    },
    value: {kind: 'uncertain'},
  })
})
it('should reject malformed independent review records at the inquiry boundary', async () => {
  const input = make()
  input.assessor.mockImplementation(close)
  const auditor = async (state: InquiryAuditOptions) => {
    const response = await reject(state)
    return {...response, checks: {answers: response.value, evidence: []}}
  }
  expect(await runInquiryResearch({...input, auditor, linked: [point('c')]})).toEqual({
    error: {code: 'invalid-inquiry-audit'},
    ok: false,
  })
})
it('should reopen a rejected linked answer and search within the original budget', async () => {
  const input = make()
  input.assessor.mockImplementation(close)
  input.reader.search.mockResolvedValue({ok: true, value: []})
  input.planner.mockImplementation(async ({inquiries}) => ({
    ok: true,
    value: inquiries.map((question) => ({
      query: `scope ${question.attempts.length}`,
      questionId: question.id,
    })),
  }))
  const auditor = vi.fn(reject)
  const result = await runInquiryResearch({...input, auditor, linked: [point('c')]})
  expect(result).toMatchObject({
    ok: true,
    research: {
      journal: {
        questions: [
          {
            attempts: [{query: 'scope 0'}, {query: 'scope 1'}],
            confirmed: '',
            remaining: 'Does this policy apply to playlists?',
          },
        ],
      },
      reused: {
        decision: {
          audits: [
            {
              answer: 'C defines the policy.',
              question: input.questions[0],
              sources: [{text: 'Evidence c'}],
              supported: false,
            },
          ],
        },
      },
      stop: 'no-new-evidence',
    },
    value: {kind: 'uncertain'},
  })
  expect(auditor).toHaveBeenCalledTimes(1)
  expect(auditor.mock.calls[0][0]).not.toHaveProperty('proposed')
  expect(auditor.mock.calls[0][0].questions[0]).toMatchObject({
    answer: 'C defines the policy.',
    evidence: [{text: 'Evidence c'}],
  })
  expect(input.reader.search).toHaveBeenCalledTimes(2)
  expect(input.planner.mock.calls[0][0].inquiries[0].remaining).toBe(
    'Does this policy apply to playlists?',
  )
})
it('should resolve a reopened question after new evidence passes its own audit', async () => {
  const input = make()
  input.assessor.mockImplementation(async (state) => {
    const decision = await close(state)
    const hasNew = state.selection.sources.some((source) => source.pointId === 'd')
    return {
      ...decision,
      value: {
        ...decision.value,
        findings: decision.value.findings.map((finding) => ({
          ...finding,
          citations: [hasNew ? 'context-2-left-1' : 'context-1-left-1'],
        })),
      },
    }
  })
  input.points.push(point('d'))
  input.reader.search.mockResolvedValue({ok: true, value: [{...point('d'), score: 1}]})
  const auditor = vi
    .fn(reject)
    .mockImplementationOnce(reject)
    .mockImplementation(async ({questions}) => ({
      ok: true,
      value: questions.map((question) => ({
        evidence: [question.evidence[0].id],
        missing: '',
        questionId: question.id,
        reason: 'Explicit applicability.',
        supported: true,
      })),
    }))
  const result = await runInquiryResearch({...input, auditor, linked: [point('c')]})
  expect(result).toMatchObject({
    ok: true,
    research: {
      journal: {questions: [{attempts: [{query: 'playlist scope'}], remaining: ''}]},
      stop: 'resolved',
    },
    value: {kind: 'unrelated'},
  })
  expect(auditor).toHaveBeenCalledTimes(2)
  expect(auditor.mock.calls[1][0].questions[0].evidence[0].text).toBe('Evidence d')
  expect(input.reader.search).toHaveBeenCalledTimes(1)
})
it('should propagate audit failures without returning a successful journal', async () => {
  const input = make()
  input.assessor.mockImplementation(close)
  const auditor = vi
    .fn()
    .mockResolvedValue({error: {code: 'inspection-audit-unavailable'}, ok: false})
  expect(await runInquiryResearch({...input, auditor, linked: [point('c')]})).toEqual({
    error: {code: 'inspection-audit-unavailable'},
    ok: false,
  })
  expect(input.reader.search).not.toHaveBeenCalled()
})
it('should stop after three audits and two rounds without resetting question attempts', async () => {
  const input = make()
  input.assessor.mockImplementation(close)
  input.points.push(point('d'), point('e'))
  input.reader.search
    .mockResolvedValueOnce({ok: true, value: [{...point('d'), score: 1}]})
    .mockResolvedValueOnce({ok: true, value: [{...point('e'), score: 1}]})
  input.planner.mockImplementation(async ({inquiries}) => ({
    ok: true,
    value: inquiries.map((question) => ({
      query: `scope ${question.attempts.length}`,
      questionId: question.id,
    })),
  }))
  const auditor = vi.fn(reject)
  const result = await runInquiryResearch({...input, auditor, linked: [point('c')]})
  expect(result).toMatchObject({
    ok: true,
    research: {
      journal: {
        questions: [
          {
            attempts: [{query: 'scope 0'}, {query: 'scope 1'}],
            confirmed: '',
            remaining: 'Does this policy apply to playlists?',
          },
        ],
      },
      stop: 'round-limit',
    },
    value: {kind: 'uncertain'},
  })
  expect(auditor).toHaveBeenCalledTimes(3)
  expect(input.assessor).toHaveBeenCalledTimes(3)
  expect(input.reader.search).toHaveBeenCalledTimes(2)
  expect(new Set(auditor.mock.calls.map(([data]) => data.questions[0].id)).size).toBe(1)
  if (!result.ok) {
    throw new Error('Expected bounded research')
  }
  input.reader.search.mockClear()
  input.planner.mockClear()
  expect(
    await runInquiryResearch({
      ...input,
      auditor,
      history: result.research.journal,
      linked: [point('c')],
    }),
  ).toMatchObject({ok: true, research: {stop: 'no-new-queries'}, value: {kind: 'uncertain'}})
  expect(input.reader.search).not.toHaveBeenCalled()
  expect(input.planner).not.toHaveBeenCalled()
})
it('should reopen only rejected questions and retain accepted answers', async () => {
  const input = make()
  input.questions.push('Is manual cleanup allowed?')
  input.assessor.mockImplementation(close)
  input.reader.search.mockResolvedValue({ok: true, value: []})
  const auditor = vi.fn(
    async (data: InquiryAuditOptions): Promise<InquiryAuditSuccess> => ({
      ok: true,
      value: data.questions.map((question, index) =>
        index === 0
          ? {
              evidence: [],
              missing: 'Does this policy apply?',
              questionId: question.id,
              reason: 'Missing scope.',
              supported: false,
            }
          : {
              evidence: [question.evidence[0].id],
              missing: '',
              questionId: question.id,
              reason: 'Explicit scope.',
              supported: true,
            },
      ),
    }),
  )
  const result = await runInquiryResearch({...input, auditor, linked: [point('c')]})
  expect(result).toMatchObject({
    ok: true,
    research: {
      journal: {
        questions: [
          {confirmed: '', remaining: 'Does this policy apply?'},
          {attempts: [], confirmed: 'C defines the policy.', remaining: ''},
        ],
      },
    },
    value: {kind: 'uncertain'},
  })
  expect(input.planner.mock.calls[0][0].inquiries).toHaveLength(1)
})
it('should reject invalid audits before searching and invalid citations before auditing', async () => {
  const input = make()
  input.assessor.mockImplementation(close)
  const auditor = vi.fn().mockResolvedValue({ok: true, value: []})
  expect(await runInquiryResearch({...input, auditor, linked: [point('c')]})).toMatchObject({
    error: {code: 'invalid-inquiry-audit'},
    ok: false,
  })
  expect(input.reader.search).not.toHaveBeenCalled()
  auditor.mockClear()
  input.assessor.mockImplementation(async (state) => {
    const result = await close(state)
    return {
      ...result,
      value: {
        ...result.value,
        findings: result.value.findings.map((finding) => ({...finding, citations: ['invented']})),
      },
    }
  })
  expect(await runInquiryResearch({...input, auditor, linked: [point('c')]})).toMatchObject({
    error: {code: 'invalid-inquiry-findings'},
    ok: false,
  })
  expect(auditor).not.toHaveBeenCalled()
})
it('should not audit partial answers or repair invalid uncertain findings', async () => {
  const input = make()
  const auditor = vi.fn(reject)
  expect(await runInquiryResearch({...input, auditor, linked: [point('c')]})).toMatchObject({
    ok: true,
    value: {kind: 'uncertain'},
  })
  expect(auditor).not.toHaveBeenCalled()
  input.assessor.mockImplementation(async (state) => {
    const result = await close(state)
    return {...result, value: {...result.value, proposed: initial}}
  })
  expect(await runInquiryResearch({...input, auditor, linked: [point('c')]})).toMatchObject({
    error: {code: 'invalid-inquiry-findings'},
    ok: false,
  })
  expect(auditor).not.toHaveBeenCalled()
})
it('should retain uncertainty when a conflict proposal leaves an unanswered question', async () => {
  const input = make()
  const assessor = input.assessor.getMockImplementation()!
  input.assessor.mockImplementation(async (options) => {
    const result = await assessor(options)
    return {
      ...result,
      value: {
        ...result.value,
        proposed: {...initial, kind: 'conflict', leftQuote: 'Evidence a', rightQuote: 'Evidence b'},
      },
    }
  })
  expect(await runInquiryResearch(input)).toMatchObject({ok: true, value: {kind: 'uncertain'}})
})
it('should reject duplicate question plans before searching', async () => {
  const input = make()
  input.planner.mockImplementation(async ({inquiries}) => ({
    ok: true,
    value: [
      {query: 'one', questionId: inquiries[0].id},
      {query: 'two', questionId: inquiries[0].id},
    ],
  }))
  expect(await runInquiryResearch(input)).toMatchObject({
    error: {code: 'invalid-inquiry-queries'},
    ok: false,
  })
  expect(input.reader.search).not.toHaveBeenCalled()
})
it.each(['planner', 'assessor', 'reader'] as const)(
  'should report a failed %s without a successful journal',
  async (port) => {
    const input = make()
    const target = port === 'reader' ? input.reader.search : input[port]
    target.mockRejectedValue(new Error('Unavailable'))
    const result = await runInquiryResearch(input)
    expect(result.ok).toBe(false)
    expect(result).not.toHaveProperty('research')
  },
)
it('should reject history whose cited passage is absent from the current source', async () => {
  const input = make()
  const first = await runInquiryResearch(input)
  if (!first.ok) {
    throw new Error('Expected first run')
  }
  const history = {
    ...first.research.journal,
    questions: first.research.journal.questions.map((question) => ({
      ...question,
      evidence: [{contentHash: 'c', passage: 'Invented evidence', pointId: 'c'}],
    })),
  }
  expect(await runInquiryResearch({...input, history})).toMatchObject({
    error: {code: 'inquiry-research-unavailable'},
    ok: false,
  })
})
it('should stop at six searches for a question even with an unused cited clue', async () => {
  const input = make()
  const first = await runInquiryResearch(input)
  if (!first.ok) {
    throw new Error('Expected first run')
  }
  const history = {
    ...first.research.journal,
    questions: first.research.journal.questions.map((question) => ({
      ...question,
      attempts: Array.from({length: 6}, (_, index) => ({clues: [], query: `query ${index}`})),
    })),
  }
  input.reader.search.mockClear()
  input.planner.mockClear()
  expect(await runInquiryResearch({...input, history, linked: [point('c')]})).toMatchObject({
    ok: true,
    research: {stop: 'no-new-queries'},
    value: {kind: 'uncertain'},
  })
  expect(input.reader.search).not.toHaveBeenCalled()
  expect(input.planner).not.toHaveBeenCalled()
})
it('should associate findings citations and executed searches with stable question IDs', async () => {
  const input = make()
  const result = await runInquiryResearch(input)
  expect(result).toMatchObject({
    ok: true,
    research: {
      journal: {
        questions: [
          {
            attempts: [{query: 'playlist scope'}],
            confirmed: 'C describes storage.',
            evidence: [{contentHash: 'c', passage: 'Evidence c', pointId: 'c'}],
            remaining: 'The exception is not defined.',
            text: input.questions[0],
          },
        ],
      },
    },
    value: {kind: 'uncertain'},
  })
})
it('should skip an exhausted investigation on restart even when the initial question is rephrased', async () => {
  const input = make()
  input.planner.mockImplementation(async ({inquiries}) => ({
    ok: true,
    value: inquiries.map((question) => ({
      query: `scope ${question.attempts.length}`,
      questionId: question.id,
    })),
  }))
  input.reader.search.mockResolvedValue({ok: true, value: []})
  const first = await runInquiryResearch(input)
  if (!first.ok) {
    throw new Error('Expected first run')
  }
  input.reader.search.mockClear()
  input.planner.mockClear()
  const second = await runInquiryResearch({
    ...input,
    history: first.research.journal,
    questions: ['What is the playlist exception?'],
  })
  expect(second).toMatchObject({
    ok: true,
    research: {journal: {questions: [{text: input.questions[0]}]}, stop: 'no-new-queries'},
    value: {kind: 'uncertain'},
  })
  expect(input.reader.search).not.toHaveBeenCalled()
  expect(input.planner).not.toHaveBeenCalled()
})
it('should resolve a missed answer with one alternate query in the same run', async () => {
  const input = make()
  input.planner.mockImplementation(async ({inquiries}) => ({
    ok: true,
    value: inquiries.map((question) => ({
      query: question.attempts.length === 0 ? 'general persistence' : 'playlist exception',
      questionId: question.id,
    })),
  }))
  input.reader.search.mockResolvedValueOnce({ok: true, value: []})
  input.assessor.mockImplementation(async ({inquiries}) => ({
    ok: true,
    value: {
      findings: inquiries.map((question) => ({
        citations: ['context-1-left-1'],
        confirmed: 'C defines the exception.',
        questionId: question.id,
        remaining: '',
      })),
      proposed: {...initial, kind: 'unrelated'},
    },
  }))
  const result = await runInquiryResearch(input)
  expect(result).toMatchObject({ok: true, research: {stop: 'resolved'}, value: {kind: 'unrelated'}})
  expect(input.reader.search.mock.calls.map(([query]) => query.query)).toEqual([
    'general persistence',
    'playlist exception',
  ])
  expect(result).toMatchObject({
    research: {
      journal: {
        questions: [{attempts: [{query: 'general persistence'}, {query: 'playlist exception'}]}],
      },
    },
  })
})
it('should stop after two fruitless query variants and preserve the budget across restart', async () => {
  const input = make()
  input.reader.search.mockResolvedValue({ok: true, value: []})
  input.planner.mockImplementation(async ({inquiries}) => ({
    ok: true,
    value: inquiries.map((question) => ({
      query: `variant ${question.attempts.length}`,
      questionId: question.id,
    })),
  }))
  const first = await runInquiryResearch(input)
  if (!first.ok) {
    throw new Error('Expected first run')
  }
  expect(input.reader.search).toHaveBeenCalledTimes(2)
  expect(first.value.kind).toBe('uncertain')
  input.reader.search.mockClear()
  input.planner.mockClear()
  const second = await runInquiryResearch({...input, history: first.research.journal})
  expect(second).toMatchObject({
    ok: true,
    research: {stop: 'no-new-queries'},
    value: {kind: 'uncertain'},
  })
  expect(input.reader.search).not.toHaveBeenCalled()
  expect(input.planner).not.toHaveBeenCalled()
})
it('should use the remaining alternate query allowance after restarting a one-attempt history', async () => {
  const input = make()
  input.reader.search.mockResolvedValue({ok: true, value: []})
  const first = await runInquiryResearch(input)
  if (!first.ok) {
    throw new Error('Expected first run')
  }
  expect(first.research.journal.questions[0].attempts).toHaveLength(1)
  input.reader.search.mockClear()
  input.planner.mockImplementation(async ({inquiries}) => ({
    ok: true,
    value: inquiries.map((question) => ({query: 'playlist exception', questionId: question.id})),
  }))
  const second = await runInquiryResearch({...input, history: first.research.journal})
  expect(second).toMatchObject({ok: true, value: {kind: 'uncertain'}})
  expect(input.reader.search).toHaveBeenCalledTimes(1)
  expect(second).toMatchObject({
    research: {
      journal: {
        questions: [
          {
            attempts: [{query: 'playlist scope'}, {query: 'playlist exception'}],
          },
        ],
      },
    },
  })
})
it('should reuse question evidence and stop repeating searches without new cited clues', async () => {
  const input = make()
  input.planner.mockImplementation(async (state) => ({
    ok: true,
    value: state.inquiries.map((q) => ({query: `scope ${q.attempts.length}`, questionId: q.id})),
  }))
  const first = await runInquiryResearch(input)
  if (!first.ok) {
    throw new Error('Expected first run')
  }
  expect(input.reader.search).toHaveBeenCalledTimes(2)
  input.reader.search.mockClear()
  input.planner.mockClear()
  const second = await runInquiryResearch({
    ...input,
    history: first.research.journal,
    linked: [point('c')],
  })
  expect(second).toMatchObject({
    ok: true,
    research: {reused: {added: ['c']}, stop: 'no-new-queries'},
    value: {kind: 'uncertain'},
  })
  expect(input.reader.search).not.toHaveBeenCalled()
  expect(input.assessor).toHaveBeenCalledTimes(2)
})
it('should reopen investigation when any scoped document is added changed or removed', async () => {
  const input = make()
  input.reader.search.mockResolvedValue({ok: true, value: []})
  const first = await runInquiryResearch(input)
  if (!first.ok) {
    throw new Error('Expected first run')
  }
  for (const points of [
    [...input.points, point('new')],
    [pair.left, pair.right],
    [
      ...input.points.slice(0, 2),
      {...point('c'), payload: {...point('c').payload, text: 'Changed'}},
    ],
  ]) {
    input.reader.search.mockClear()
    expect(
      // eslint-disable-next-line no-await-in-loop -- Each corpus variant starts from the same persisted history.
      await runInquiryResearch({...input, history: first.research.journal, points}),
    ).toMatchObject({ok: true})
    expect(input.reader.search).toHaveBeenCalledTimes(1)
  }
})
it('should reject resolved findings without citations and preserve uncertainty after partial evidence', async () => {
  const input = make()
  input.assessor.mockImplementation(async (state) => ({
    ok: true,
    value: {
      findings: state.inquiries.map((q) => ({
        citations: [],
        confirmed: 'Exception exists.',
        questionId: q.id,
        remaining: '',
      })),
      proposed: {...initial, kind: 'unrelated' as const},
    },
  }))
  expect(await runInquiryResearch(input)).toMatchObject({ok: false})
})
it('should reject query targets outside the pending questions before performing searches', async () => {
  const input = make()
  input.planner.mockResolvedValue({ok: true, value: [{query: 'scope', questionId: 'invented'}]})
  expect(await runInquiryResearch(input)).toMatchObject({ok: false})
  expect(input.reader.search).not.toHaveBeenCalled()
})
it('should still review linked evidence when the initial comparison has no missing questions', async () => {
  const input = make()
  const result = await runInquiryResearch({
    ...input,
    initial: {...initial, kind: 'unrelated'},
    linked: [point('c')],
    questions: [],
  })
  expect(result).toMatchObject({
    ok: true,
    research: {reused: {added: ['c']}},
    value: {kind: 'uncertain'},
  })
  expect(input.assessor).toHaveBeenCalled()
  expect(input.assessor.mock.calls[0][0].inquiries).toHaveLength(1)
})
it('should not repeat an identical previous query even when a fresh citation is available', async () => {
  const input = make()
  const first = await runInquiryResearch(input)
  if (!first.ok) {
    throw new Error('Expected first run')
  }
  input.reader.search.mockClear()
  expect(
    await runInquiryResearch({...input, history: first.research.journal, linked: [point('c')]}),
  ).toMatchObject({ok: true, value: {kind: 'uncertain'}})
  expect(input.reader.search).not.toHaveBeenCalled()
})
