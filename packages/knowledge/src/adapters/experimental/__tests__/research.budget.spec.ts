import {createHash} from 'node:crypto'
import {afterEach, expect, it, vi} from 'vitest'
import {classifyResearchPair} from '../research'
import {researchJournalSchema} from '../../../inspection/index'

const model = {digest: 'a'.repeat(64), name: 'test'}
const payload = {
  contentHash: 'hash',
  docId: 'doc',
  path: 'doc.md',
  relations: [],
  repoId: 'repo',
  status: 'active' as const,
  tags: [],
  text: 'Store records.',
  title: 'Storage',
  type: 'rule' as const,
  unitId: 'main',
  workspaceId: 'main',
}
const point = {
  payload: {...payload, docId: 'exception', text: 'Playlists are excluded.'},
  pointId: 'c',
}
const questionId = createHash('sha256').update(JSON.stringify('scope?')).digest('hex')
const proposal = {
  confidence: 0.8,
  findings: [
    {
      citations: ['context-1-left-1'],
      confirmed: 'Playlists are excluded.',
      questionId,
      remaining: '',
    },
  ],
  kind: 'unrelated',
  leftEvidence: 'none',
  reason: 'Explicit exclusion.',
  rightEvidence: 'none',
}
const audit = {
  findings: [
    {
      evidence: [`${questionId}:0`],
      missing: '',
      questionId,
      reason: 'Explicit exclusion.',
      supported: true,
    },
  ],
}
const setup = () => {
  const responses: unknown[] = [
    {confidence: 0.5, kind: 'uncertain', reason: 'Missing scope.'},
    {leftEvidence: 'none', rightEvidence: 'none'},
    {questions: ['Scope?']},
    {queries: [{query: 'playlist scope', questionId}]},
    proposal,
    audit,
    audit,
  ]
  const generate = vi.fn(() => {
    const response = responses.shift()
    expect(response).toBeDefined()
    return Response.json({done: true, model: model.name, response: JSON.stringify(response)})
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL | string) =>
      new URL(url).pathname === '/api/tags' ? Response.json({models: [model]}) : generate(),
    ),
  )
  const options = {
    baseUrl: 'http://localhost:11434',
    model,
    pair: {left: {payload, pointId: 'a'}, right: {payload, pointId: 'b'}},
    points: [point],
    reader: {search: vi.fn().mockResolvedValue({ok: true, value: [{...point, score: 1}]})},
  }
  return {generate, options, responses}
}
afterEach(() => vi.unstubAllGlobals())

it.each([7, 8])(
  'should reserve all flat questions and the answer audit together: %s',
  async (maxCalls) => {
    const {generate, options, responses} = setup()
    const secondId = createHash('sha256').update(JSON.stringify('exception?')).digest('hex')
    responses[2] = {questions: ['Scope?', 'Exception?']}
    responses[4] = {
      ...proposal,
      findings: [...proposal.findings, {...proposal.findings[0], questionId: secondId}],
    }
    responses.splice(
      5,
      2,
      {choice: 'determined', quote: point.payload.text, reason: 'Explicit exclusion.'},
      {choice: 'determined', quote: point.payload.text, reason: 'Explicit exclusion.'},
      {
        findings: [
          ...audit.findings,
          {...audit.findings[0], evidence: [`${secondId}:0`], questionId: secondId},
        ],
      },
    )
    const result = await classifyResearchPair({...options, evidenceReview: 'flat', maxCalls})
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) {
      throw new Error('Expected research record')
    }
    expect(generate).toHaveBeenCalledTimes(maxCalls === 7 ? 5 : 8)
    expect(result.research.stop).toBe(maxCalls === 7 ? 'call-limit' : 'resolved')
    expect(result.research.journal?.questions.every((question) => question.confirmed === '')).toBe(
      maxCalls === 7,
    )
  },
)

it('should enforce the default budget across linked evidence and both search rounds', async () => {
  const {generate, options, responses} = setup()
  const rejected = {
    findings: [{...audit.findings[0], evidence: [], missing: 'Scope?', supported: false}],
  }
  responses.splice(
    2,
    responses.length,
    {questions: []},
    {questions: ['Scope?']},
    proposal,
    rejected,
    rejected,
    {queries: [{query: 'playlist scope', questionId}]},
    proposal,
    rejected,
    rejected,
    {queries: [{query: 'playlist exception', questionId}]},
    proposal,
  )
  const additional = ['d', 'e'].map((pointId) => ({
    payload: {...payload, contentHash: pointId, docId: pointId, text: `Additional ${pointId}`},
    pointId,
  }))
  options.reader.search
    .mockResolvedValueOnce({ok: true, value: [{...additional[0], score: 1}]})
    .mockResolvedValueOnce({ok: true, value: [{...additional[1], score: 1}]})
  const result = await classifyResearchPair({
    ...options,
    linked: [point],
    points: [point, ...additional],
  })
  expect(result).toMatchObject({
    ok: true,
    research: {
      budget: {limit: 14, reserved: 13},
      journal: {questions: [{confirmed: '', remaining: 'Scope?'}]},
      stop: 'call-limit',
    },
    value: {kind: 'uncertain'},
  })
  if (!result.ok) {
    throw new Error('Expected budget stop')
  }
  expect(result.research.rounds).toHaveLength(2)
  expect(result.research.selection.sources).toHaveLength(3)
  expect(result.research.rounds[1].decision?.unreviewed).toHaveLength(1)
  expect(generate).toHaveBeenCalledTimes(13)
  expect(options.reader.search).toHaveBeenCalledTimes(2)
})

it('should resume a budget-stopped audited question using its retained journal and linked evidence', async () => {
  const first = setup()
  const stopped = await classifyResearchPair({...first.options, maxCalls: 5})
  expect(stopped.ok).toBe(true)
  if (!stopped.ok) {
    throw new Error('Expected stopped research')
  }
  const history = researchJournalSchema.parse(stopped.research.journal)
  const second = setup()
  second.responses.splice(3, 1)
  const resumed = await classifyResearchPair({
    ...second.options,
    history,
    linked: [point],
    maxCalls: 6,
  })
  expect(resumed).toMatchObject({
    ok: true,
    research: {
      journal: {
        questions: [
          {
            attempts: [{query: 'playlist scope'}],
            confirmed: 'Playlists are excluded.',
            remaining: '',
          },
        ],
      },
      stop: 'resolved',
    },
    value: {kind: 'unrelated'},
  })
  expect(second.generate).toHaveBeenCalledTimes(6)
  expect(second.options.reader.search).not.toHaveBeenCalled()
})

it('should reserve the replacement-question request before searching', async () => {
  const {generate, options, responses} = setup()
  responses.splice(2, 1, {questions: []})
  expect(await classifyResearchPair({...options, maxCalls: 3})).toEqual({
    error: {code: 'inspection-call-limit'},
    ok: false,
  })
  expect(generate).toHaveBeenCalledTimes(3)
  expect(options.reader.search).not.toHaveBeenCalled()
})
it('should count replacement questions and preserve them when planning is blocked', async () => {
  const {generate, options, responses} = setup()
  responses.splice(2, 2, {questions: []}, {questions: ['Scope?']})
  expect(await classifyResearchPair({...options, maxCalls: 4})).toMatchObject({
    ok: true,
    research: {
      budget: {limit: 4, reserved: 4},
      journal: {questions: [{remaining: 'Scope?', text: 'Scope?'}]},
      stop: 'call-limit',
    },
  })
  expect(generate).toHaveBeenCalledTimes(4)
  expect(options.reader.search).not.toHaveBeenCalled()
})
it('should preserve linked proposals as unreviewed without issuing either audit request', async () => {
  const {generate, options, responses} = setup()
  responses.splice(3, 1)
  const result = await classifyResearchPair({...options, linked: [point], maxCalls: 5})
  expect(result).toMatchObject({
    ok: true,
    research: {
      budget: {limit: 5, reserved: 4},
      journal: {questions: [{confirmed: '', evidence: [{pointId: 'c'}], remaining: 'Scope?'}]},
      reused: {decision: {unreviewed: [{answer: 'Playlists are excluded.'}]}},
      stop: 'call-limit',
    },
    value: {kind: 'uncertain'},
  })
  expect(generate).toHaveBeenCalledTimes(4)
  expect(options.reader.search).not.toHaveBeenCalled()
})
it('should stop before the second planner call and preserve the completed empty search', async () => {
  const {generate, options} = setup()
  options.reader.search.mockResolvedValue({ok: true, value: []})
  expect(await classifyResearchPair({...options, maxCalls: 4})).toMatchObject({
    ok: true,
    research: {
      journal: {questions: [{attempts: [{query: 'playlist scope'}], remaining: 'Scope?'}]},
      rounds: [{added: []}],
      stop: 'call-limit',
    },
  })
  expect(generate).toHaveBeenCalledTimes(4)
  expect(options.reader.search).toHaveBeenCalledTimes(1)
})

it.each([0, 2])(
  'should reject an insufficient initial budget before generation: %s',
  async (maxCalls) => {
    const {generate, options} = setup()
    expect(await classifyResearchPair({...options, maxCalls})).toEqual({
      error: {code: 'inspection-call-limit'},
      ok: false,
    })
    expect(generate).not.toHaveBeenCalled()
    expect(options.reader.search).not.toHaveBeenCalled()
  },
)
it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
  'should reject an invalid call budget: %s',
  async (maxCalls) => {
    const {generate, options} = setup()
    expect(await classifyResearchPair({...options, maxCalls})).toEqual({
      error: {code: 'invalid-inspection-budget'},
      ok: false,
    })
    expect(generate).not.toHaveBeenCalled()
  },
)
it.each([3, 4, 5, 6, 7])(
  'should enforce the whole generation budget and preserve pending evidence: %s',
  async (maxCalls) => {
    const {generate, options} = setup()
    const result = await classifyResearchPair({...options, maxCalls})
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) {
      throw new Error('Expected research record')
    }
    const used = maxCalls === 6 ? 5 : maxCalls
    expect(generate).toHaveBeenCalledTimes(used)
    expect(result.research.budget).toEqual({limit: maxCalls, reserved: used})
    expect(result.research.stop).toBe(maxCalls === 7 ? 'resolved' : 'call-limit')
    expect(result.value.kind).toBe(maxCalls === 7 ? 'unrelated' : 'uncertain')
    const question = result.research.journal?.questions[0]
    expect(question?.confirmed).toBe(maxCalls === 7 ? 'Playlists are excluded.' : '')
    if (maxCalls >= 4) {
      expect(result.research.selection.sources[0].pointId).toBe('c')
      expect(question?.attempts).toHaveLength(1)
      expect(result.research.rounds).toHaveLength(1)
    } else {
      expect(options.reader.search).not.toHaveBeenCalled()
    }
    if (maxCalls === 5 || maxCalls === 6) {
      expect(question?.evidence[0].passage).toBe(point.payload.text)
      expect(result.research.rounds[0].decision).toMatchObject({
        stop: 'call-limit',
        unreviewed: [{answer: 'Playlists are excluded.', id: questionId, question: 'Scope?'}],
      })
      expect(result.research.rounds[0].decision?.audits).toBeUndefined()
    }
  },
)
it('should retain linked evidence when the budget stops reassessment', async () => {
  const {generate, options} = setup()
  const result = await classifyResearchPair({...options, linked: [point], maxCalls: 3})
  expect(result).toMatchObject({
    ok: true,
    research: {
      journal: {questions: [{confirmed: '', remaining: 'Scope?'}]},
      selection: {sources: [{pointId: 'c'}]},
      stop: 'call-limit',
    },
  })
  expect(generate).toHaveBeenCalledTimes(3)
  expect(options.reader.search).not.toHaveBeenCalled()
})
