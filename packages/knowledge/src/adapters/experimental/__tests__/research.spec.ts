import {createHash} from 'node:crypto'
import {afterEach, expect, it, vi} from 'vitest'
import type {InquiryQuery} from '../../../inspection/index'
import {classifyResearchPair} from '../research'
import {classifyContextualPair} from '../contextual'
import {resolveQuestionModel} from '../../questions'
vi.mock('../contextual', async () => ({
  ...(await vi.importActual('../contextual')),
  classifyContextualPair: vi.fn(),
}))
vi.mock('../../questions', () => ({resolveQuestionModel: vi.fn()}))
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
const initial = {
  confidence: 0.5,
  kind: 'uncertain' as const,
  leftQuote: '',
  reason: 'Missing scope.',
  rightQuote: '',
}
const questionId = createHash('sha256').update(JSON.stringify('scope?')).digest('hex')
const auditResponse = () =>
  Response.json({
    done: true,
    model: 'test',
    response: JSON.stringify({
      findings: [
        {
          evidence: [`${questionId}:0`],
          missing: '',
          questionId,
          reason: 'Explicit exclusion.',
          supported: true,
        },
      ],
    }),
  })
const point = {
  payload: {...payload, docId: 'exception', text: 'Playlists are excluded.'},
  pointId: 'c',
}
const options = {
  baseUrl: 'http://localhost:11434',
  model: {digest: 'a'.repeat(64), name: 'test'},
  pair: {left: {payload, pointId: 'a'}, right: {payload, pointId: 'b'}},
  points: [point],
  reader: {search: vi.fn().mockResolvedValue({ok: true, value: [{...point, score: 1}]})},
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
it.each([{questions: []}, {questions: [' ']}, {questions: ['x'.repeat(301)]}])(
  'should reject invalid replacement questions without searching: %j',
  async ({questions}) => {
    vi.mocked(classifyContextualPair).mockResolvedValue({
      ok: true,
      review: {
        citations: [],
        initial,
        questions: [],
        selection: {eligible: 0, sources: [], truncated: false},
        unresolved: [],
      },
      value: initial,
    })
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({done: true, model: 'test', response: JSON.stringify({questions})}),
      )
    vi.stubGlobal('fetch', fetch)
    expect(await classifyResearchPair(options)).toEqual({
      error: {code: 'invalid-inspection-response'},
      ok: false,
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(options.reader.search).not.toHaveBeenCalled()
  },
)
it('should rewrite the full uncertain reason into a question before planning', async () => {
  const reason = `${'Context. '.repeat(40)}Which input mode does the summary describe?`
  const proposal = {...initial, reason}
  vi.mocked(classifyContextualPair).mockResolvedValue({
    ok: true,
    review: {
      citations: [],
      initial: proposal,
      questions: [],
      selection: {eligible: 0, sources: [], truncated: false},
      unresolved: [],
    },
    value: proposal,
  })
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        done: true,
        model: 'test',
        response: JSON.stringify({questions: ['Which input mode does the summary describe?']}),
      }),
    )
    .mockResolvedValueOnce(
      Response.json({done: true, model: 'test', response: JSON.stringify({queries: []})}),
    )
  vi.stubGlobal('fetch', fetch)
  expect(await classifyResearchPair(options)).toMatchObject({
    error: {code: 'invalid-inspection-queries'},
    ok: false,
  })
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(JSON.parse(fetch.mock.calls[0][1].body).prompt).toContain(reason)
  expect(JSON.parse(fetch.mock.calls[0][1].body).prompt).toContain(payload.text)
  expect(JSON.parse(fetch.mock.calls[1][1].body).prompt).toContain(
    'Which input mode does the summary describe?',
  )
  expect(options.reader.search).not.toHaveBeenCalled()
})
it.each(['', '   '])(
  'should reject uncertain without a missing condition and constrain generation: %j',
  async (remaining) => {
    vi.mocked(classifyContextualPair).mockResolvedValue({
      ok: true,
      review: {
        citations: [],
        initial,
        questions: ['Scope?'],
        selection: {eligible: 0, sources: [], truncated: false},
        unresolved: ['Scope?'],
      },
      value: initial,
    })
    const fetch = vi.fn().mockResolvedValueOnce(
      Response.json({
        done: true,
        model: 'test',
        response: JSON.stringify({
          confidence: 0,
          findings: [
            {
              citations: ['context-1-left-1'],
              confirmed: 'Playlists are excluded.',
              questionId,
              remaining,
            },
          ],
          kind: 'uncertain',
          leftEvidence: 'none',
          reason: 'The definition is still uncertain.',
          rightEvidence: 'none',
        }),
      }),
    )
    vi.stubGlobal('fetch', fetch)
    expect(await classifyResearchPair({...options, linked: [point]})).toEqual({
      error: {code: 'invalid-inquiry-findings'},
      ok: false,
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(options.reader.search).not.toHaveBeenCalled()
    const request = JSON.parse(fetch.mock.calls[0][1].body)
    expect(request.format.anyOf).toHaveLength(2)
    for (const branch of request.format.anyOf) {
      expect(branch.required).toEqual([
        'confidence',
        'findings',
        'kind',
        'leftEvidence',
        'reason',
        'rightEvidence',
      ])
      expect(branch.additionalProperties).toBe(false)
      expect(branch.properties.findings).toMatchObject({maxItems: 1, minItems: 1})
    }
    expect(request.format.anyOf[0].properties.kind.enum).toEqual([
      'duplicate',
      'conflict',
      'unrelated',
    ])
    expect(request.format.anyOf[1].properties).toMatchObject({
      findings: {contains: {properties: {remaining: {pattern: '\\S'}}, required: ['remaining']}},
      kind: {const: 'uncertain'},
    })
    expect(request.prompt).toContain(
      'uncertain requires at least one non-empty remaining condition',
    )
  },
)
it.each([true, false])(
  'should allow an empty plan only after a search attempt: first empty %s',
  async (empty) => {
    vi.mocked(classifyContextualPair).mockResolvedValue({
      ok: true,
      review: {
        citations: [],
        initial,
        questions: ['Scope?'],
        selection: {eligible: 0, sources: [], truncated: false},
        unresolved: ['Scope?'],
      },
      value: initial,
    })
    options.reader.search.mockResolvedValue({ok: true, value: []})
    vi.mocked(resolveQuestionModel).mockResolvedValue({ok: true, value: options.model})
    const response = (queries: ReadonlyArray<InquiryQuery>) =>
      Response.json({done: true, model: 'test', response: JSON.stringify({queries})})
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(empty ? [] : [{query: 'playlist scope', questionId}]))
      .mockResolvedValueOnce(response([]))
    vi.stubGlobal('fetch', fetch)
    const result = await classifyResearchPair(options)
    if (empty) {
      expect(result).toEqual({error: {code: 'invalid-inspection-queries'}, ok: false})
      expect(options.reader.search).not.toHaveBeenCalled()
      expect(fetch).toHaveBeenCalledTimes(1)
    } else {
      expect(result).toMatchObject({
        ok: true,
        research: {stop: 'no-new-queries'},
        value: {kind: 'uncertain'},
      })
      expect(options.reader.search).toHaveBeenCalledTimes(1)
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(JSON.parse(fetch.mock.calls[1][1].body).format.properties.queries.minItems).toBe(0)
    }
  },
)
it('should preserve an answered question while another condition remains uncertain', async () => {
  const retentionId = createHash('sha256').update(JSON.stringify('retention?')).digest('hex')
  vi.mocked(classifyContextualPair).mockResolvedValue({
    ok: true,
    review: {
      citations: [],
      initial,
      questions: ['Scope?', 'Retention?'],
      selection: {eligible: 0, sources: [], truncated: false},
      unresolved: ['Scope?', 'Retention?'],
    },
    value: initial,
  })
  options.reader.search.mockResolvedValue({ok: true, value: [{...point, score: 1}]})
  vi.mocked(resolveQuestionModel).mockResolvedValue({ok: true, value: options.model})
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        done: true,
        model: 'test',
        response: JSON.stringify({
          confidence: 0.5,
          findings: [
            {
              citations: ['context-1-left-1'],
              confirmed: 'Playlists are excluded.',
              questionId,
              remaining: '',
            },
            {
              citations: [],
              confirmed: '',
              questionId: retentionId,
              remaining: 'Retention is undefined.',
            },
          ],
          kind: 'uncertain',
          leftEvidence: 'none',
          reason: 'Retention is undefined.',
          rightEvidence: 'none',
        }),
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        done: true,
        model: 'test',
        response: JSON.stringify({queries: [{query: 'retention policy', questionId: retentionId}]}),
      }),
    )
    .mockResolvedValueOnce(
      Response.json({done: true, model: 'test', response: JSON.stringify({queries: []})}),
    )
  vi.stubGlobal('fetch', fetch)
  const result = await classifyResearchPair({...options, linked: [point]})
  expect(result.ok, JSON.stringify(result)).toBe(true)
  expect(result).toMatchObject({
    ok: true,
    research: {
      journal: {
        questions: [
          {confirmed: 'Playlists are excluded.', remaining: ''},
          {remaining: 'Retention is undefined.'},
        ],
      },
      stop: 'no-new-queries',
    },
    value: {kind: 'uncertain'},
  })
  expect(fetch).toHaveBeenCalledTimes(3)
  const format = JSON.parse(fetch.mock.calls[0][1].body).format
  expect(format.anyOf[1].properties.findings).toMatchObject({maxItems: 2, minItems: 2})
  expect(format.anyOf[1].properties.findings.items.properties.remaining.minLength).toBeUndefined()
})
it.each([
  {citations: ['context-1-left-1'], valid: true},
  {citations: ['context-1-left-1', 'context-1-left-1'], valid: true},
  {citations: ['invented', 'invented'], valid: false},
  {citations: Array.from({length: 7}, () => 'context-1-left-1'), valid: false},
])(
  'should normalize repeated known citations without accepting unknown or oversized evidence: $citations',
  async ({citations, valid}) => {
    options.reader.search.mockResolvedValue({ok: true, value: [{...point, score: 1}]})
    vi.mocked(classifyContextualPair).mockResolvedValue({
      ok: true,
      review: {
        citations: [],
        initial,
        questions: ['Scope?'],
        selection: {eligible: 0, sources: [], truncated: false},
        unresolved: ['Scope?'],
      },
      value: initial,
    })
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          done: true,
          model: 'test',
          response: JSON.stringify({queries: [{query: 'playlist storage scope', questionId}]}),
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          done: true,
          model: 'test',
          response: JSON.stringify({
            confidence: 0.8,
            findings: [
              {
                citations,
                confirmed: 'Playlists are excluded.',
                questionId,
                remaining: '',
              },
            ],
            kind: 'unrelated',
            leftEvidence: 'none',
            reason: 'Explicit exclusion.',
            rightEvidence: 'none',
          }),
        }),
      )
    fetch.mockResolvedValueOnce(auditResponse())
    fetch.mockResolvedValueOnce(auditResponse())
    vi.stubGlobal('fetch', fetch)
    vi.mocked(resolveQuestionModel).mockResolvedValue({ok: true, value: options.model})
    const result = await classifyResearchPair(options)
    expect(classifyContextualPair).toHaveBeenCalledWith(
      expect.objectContaining({points: [], questionFocus: 'operation'}),
    )
    const plannerPrompt = JSON.parse(fetch.mock.calls[0][1].body).prompt
    expect(plannerPrompt).toContain(
      `Original: ${JSON.stringify({left: payload.text, right: payload.text})}.`,
    )
    expect(plannerPrompt).not.toContain('Assessment:')
    expect(plannerPrompt).not.toContain(initial.reason)
    expect(plannerPrompt).toContain('Use terms from the sources, preferably their language.')
    expect(plannerPrompt).toContain(
      'For a question with no past search attempt, propose a first query',
    )
    expect(JSON.parse(fetch.mock.calls[0][1].body).format.properties.queries.minItems).toBe(1)
    if (!valid) {
      expect(result).toMatchObject({error: {code: 'invalid-inspection-response'}, ok: false})
      expect(fetch).toHaveBeenCalledTimes(2)
      return
    }
    expect(result).toMatchObject({
      ok: true,
      research: {stop: 'resolved'},
      value: {kind: 'unrelated'},
    })
    if (!result.ok) {
      throw new Error('Expected resolved research')
    }
    expect(result.research.journal?.questions[0].evidence).toHaveLength(1)
    expect(options.reader.search).toHaveBeenCalledWith({limit: 3, query: 'playlist storage scope'})
    expect(JSON.parse(fetch.mock.calls[1][1].body).prompt).toContain(point.payload.text)
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(JSON.parse(fetch.mock.calls[2][1].body).prompt).toContain(
      'Determine whether the supplied cited passages',
    )
    const auditPrompt = JSON.parse(fetch.mock.calls[3][1].body).prompt
    expect(auditPrompt).toContain('Audit whether each proposed answer')
    expect(auditPrompt).not.toContain('"kind"')
    expect(auditPrompt).toContain('Playlists are excluded.')
  },
)
it('should send linked source text for a fresh decision without planning or searching', async () => {
  vi.mocked(classifyContextualPair).mockResolvedValue({
    ok: true,
    review: {
      citations: [],
      initial,
      questions: ['Scope?'],
      selection: {eligible: 0, sources: [], truncated: false},
      unresolved: ['Scope?'],
    },
    value: initial,
  })
  const fetch = vi.fn().mockResolvedValueOnce(
    Response.json({
      done: true,
      model: 'test',
      response: JSON.stringify({
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
      }),
    }),
  )
  fetch.mockResolvedValueOnce(auditResponse())
  fetch.mockResolvedValueOnce(auditResponse())
  vi.stubGlobal('fetch', fetch)
  vi.mocked(resolveQuestionModel).mockResolvedValue({ok: true, value: options.model})
  expect(await classifyResearchPair({...options, linked: [point]})).toMatchObject({
    ok: true,
    research: {reused: {added: ['c']}, rounds: [], stop: 'resolved'},
  })
  expect(fetch).toHaveBeenCalledTimes(3)
  expect(JSON.parse(fetch.mock.calls[0][1].body).prompt).toContain(point.payload.text)
  expect(options.reader.search).not.toHaveBeenCalled()
})
