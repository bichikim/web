import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {classifyContextualPair} from '../contextual'
import {classifySeparatedPair} from '../separated'
import {resolveQuestionModel} from '../../questions'
vi.mock('../separated', () => ({classifySeparatedPair: vi.fn()}))
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
const options = {
  baseUrl: 'http://localhost:11434',
  model: {digest: 'a'.repeat(64), name: 'test'},
  pair: {
    left: {payload, pointId: 'a'},
    right: {payload: {...payload, docId: 'other'}, pointId: 'b'},
  },
  points: [
    {
      payload: {
        ...payload,
        text: 'Playlist records are an explicit exception.',
        unitId: 'exceptions',
      },
      pointId: 'c',
    },
  ],
}
const initial = {
  confidence: 0.8,
  kind: 'conflict' as const,
  leftQuote: payload.text,
  reason: 'Different rules.',
  rightQuote: payload.text,
}
const question = 'Is the playlist an exception?'
const final = {
  citations: ['context-1-left-1'],
  confidence: 0.8,
  kind: 'unrelated',
  leftEvidence: 'left-1',
  reason: 'Explicit exception.',
  rightEvidence: 'right-1',
  unresolved: [],
}
const response = (value: unknown) =>
  Response.json({done: true, model: 'test', response: JSON.stringify(value)})
const operationInstruction =
  'For policies, ask whether the stated prohibition governs the concrete operation and trigger ' +
  'in the other claim. Do not replace this with a question about object or storage membership. '
beforeEach(() => {
  vi.mocked(classifySeparatedPair).mockResolvedValue({ok: true, value: initial})
  vi.mocked(resolveQuestionModel).mockResolvedValue({ok: true, value: options.model})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
it.each([undefined, 'operation'] as const)(
  'should select operation questions only for an explicit focus: %s',
  async (questionFocus) => {
    const fetch = vi.fn().mockResolvedValueOnce(response({questions: [question]}))
    vi.stubGlobal('fetch', fetch)
    const result = await classifyContextualPair({
      ...options,
      points: [],
      ...(questionFocus === undefined ? {} : {questionFocus}),
    })
    expect(result).toMatchObject({ok: true, review: {questions: [question]}})
    expect(fetch).toHaveBeenCalledTimes(1)
    const request = JSON.parse(fetch.mock.calls[0][1].body)
    expect(request.prompt.includes(operationInstruction)).toBe(false)
    expect(request.prompt.includes('Initial is a proposal, not evidence.')).toBe(
      questionFocus === 'operation',
    )
    if (questionFocus === 'operation') {
      expect(request.prompt).toContain('Audit whether the source Pair contains the premises')
      expect(request.prompt).toContain('do not use remembered definitions as source evidence')
      expect(request.prompt).toContain(
        'If the explicit requirements already support the comparison',
      )
    }
    expect(request.prompt).toContain(JSON.stringify({left: payload.text, right: payload.text}))
    expect(request.prompt).not.toContain(options.points[0].payload.text)
    expect(request.prompt).toContain(`Initial: ${JSON.stringify(initial)}.`)
  },
)
it.each(
  (['unrelated', 'conflict', 'duplicate', 'uncertain'] as const).flatMap((kind) =>
    ([undefined, 'operation'] as const).map((questionFocus) => ({kind, questionFocus})),
  ),
)(
  'should audit applicability only for unrelated research proposals: %j',
  async ({kind, questionFocus}) => {
    vi.mocked(classifySeparatedPair).mockResolvedValue({ok: true, value: {...initial, kind}})
    const fetch = vi.fn().mockResolvedValueOnce(response({questions: []}))
    vi.stubGlobal('fetch', fetch)
    const result = await classifyContextualPair({
      ...options,
      points: [],
      ...(questionFocus === undefined ? {} : {questionFocus}),
    })
    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetch.mock.calls[0][1].body).prompt.includes(operationInstruction)).toBe(
      questionFocus === 'operation' && kind === 'unrelated',
    )
  },
)
it('should ask for missing conditions before sending supplemental text and preserve both decisions', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(response({questions: [question]}))
    .mockResolvedValueOnce(response(final))
  vi.stubGlobal('fetch', fetch)
  const result = await classifyContextualPair(options)
  expect(result).toMatchObject({
    ok: true,
    review: {
      citations: final.citations,
      initial,
      questions: [question],
      selection: {
        sources: [{docId: 'doc', text: options.points[0].payload.text, unitId: 'exceptions'}],
      },
      unresolved: [],
    },
    value: {kind: 'unrelated'},
  })
  expect(JSON.parse(fetch.mock.calls[0][1].body).prompt).not.toContain(
    options.points[0].payload.text,
  )
  expect(JSON.parse(fetch.mock.calls[1][1].body).prompt).toContain(options.points[0].payload.text)
})
it('should preserve uncertainty when context is absent without treating missing exceptions as conflict', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response({questions: [question]}))
  vi.stubGlobal('fetch', fetch)
  expect(await classifyContextualPair({...options, points: []})).toMatchObject({
    ok: true,
    review: {selection: {eligible: 0, sources: []}, unresolved: [question]},
    value: {kind: 'uncertain'},
  })
  expect(fetch).toHaveBeenCalledTimes(1)
})
it('should keep the initial decision when no additional conditions are needed', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response({questions: []}))
  vi.stubGlobal('fetch', fetch)
  expect(await classifyContextualPair(options)).toMatchObject({
    ok: true,
    review: {citations: [], questions: []},
    value: initial,
  })
  expect(fetch).toHaveBeenCalledTimes(1)
})
it.each([
  {...final, citations: ['invented']},
  {...final, citations: []},
  {...final, kind: 'uncertain', unresolved: ['invented']},
  {...final, leftEvidence: 'right-1'},
])('should reject unsupported conclusions and invented evidence: %j', async (value) => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response({questions: [question]}))
      .mockResolvedValueOnce(response(value)),
  )
  expect(await classifyContextualPair(options)).toMatchObject({ok: false})
})
it('should retain unresolved questions even after collecting context', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response({questions: [question]}))
      .mockResolvedValueOnce(
        response({...final, citations: [], kind: 'uncertain', unresolved: [question]}),
      ),
  )
  expect(await classifyContextualPair(options)).toMatchObject({
    ok: true,
    review: {unresolved: [question]},
    value: {kind: 'uncertain'},
  })
})
it('should retain the model proposal but enforce uncertainty for unresolved conditions', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response({questions: [question]}))
      .mockResolvedValueOnce(response({...final, unresolved: [question]})),
  )
  expect(await classifyContextualPair(options)).toMatchObject({
    ok: true,
    review: {proposed: {kind: 'unrelated', reason: final.reason}, unresolved: [question]},
    value: {kind: 'uncertain', reason: `추가 문맥으로도 확인되지 않은 조건: ${question}`},
  })
})
it('should reject model changes and propagate initial or transport failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({questions: []})))
  vi.mocked(resolveQuestionModel).mockResolvedValue({
    ok: true,
    value: {...options.model, digest: 'changed'},
  })
  expect(await classifyContextualPair(options)).toMatchObject({
    error: {code: 'inspection-model-changed'},
    ok: false,
  })
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  expect(await classifyContextualPair(options)).toMatchObject({
    error: {code: 'inspection-request-failed'},
    ok: false,
  })
  vi.mocked(classifySeparatedPair).mockResolvedValue({error: {code: 'initial-failed'}, ok: false})
  expect(await classifyContextualPair(options)).toMatchObject({
    error: {code: 'initial-failed'},
    ok: false,
  })
})
