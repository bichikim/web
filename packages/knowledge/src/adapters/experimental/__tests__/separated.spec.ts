import {afterEach, expect, it, vi} from 'vitest'
import {classifySeparatedPair} from '../separated'
import {resolveQuestionModel} from '../../questions'
vi.mock('../../questions', () => ({resolveQuestionModel: vi.fn()}))
const payload = {
  contentHash: 'hash',
  docId: 'doc',
  path: 'doc.md',
  relations: [],
  repoId: 'repo',
  status: 'active' as const,
  tags: [],
  text: 'Same rule.',
  title: 'Rule',
  type: 'rule' as const,
  unitId: 'rule',
  workspaceId: 'main',
}
const options = {
  baseUrl: 'http://localhost:11434',
  model: {digest: 'a'.repeat(64), name: 'test'},
  pair: {left: {payload, pointId: 'a'}, right: {payload, pointId: 'b'}},
}
const decision = {confidence: 0.8, kind: 'duplicate', reason: 'Equivalent.'}
const selected = {leftEvidence: 'left-1', rightEvidence: 'right-1'}
const response = (value: unknown) =>
  Response.json({
    done: true,
    model: 'test',
    response: JSON.stringify(value),
  })
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
it('should reject oversized sources without making a request', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect(
    await classifySeparatedPair({
      ...options,
      pair: {
        ...options.pair,
        left: {...options.pair.left, payload: {...payload, text: 'x'.repeat(4001)}},
      },
    }),
  ).toEqual({error: {code: 'inspection-source-too-long'}, ok: false})
  expect(fetch).not.toHaveBeenCalled()
})
it.each([0, 1])('should reject transport and envelope failures at stage %i', async (stage) => {
  const invalidResponses = [
    () => new Response('', {status: 500}),
    () => Response.json({done: false}),
    () => Response.json({done: true, model: 'other', response: '{}'}),
    () => Response.json({done: true, model: 'test', response: 'invalid'}),
  ]
  for (const invalid of invalidResponses) {
    const fetch = vi.fn()
    if (stage === 1) {
      fetch.mockResolvedValueOnce(response(decision))
    }
    fetch.mockResolvedValueOnce(invalid())
    vi.stubGlobal('fetch', fetch)
    // oxlint-disable-next-line eslint/no-await-in-loop -- Each case owns the global fetch mock.
    expect(await classifySeparatedPair(options)).toEqual({
      error: {code: 'inspection-request-failed'},
      ok: false,
    })
    expect(fetch).toHaveBeenCalledTimes(stage + 1)
  }
})
it('should propagate request exceptions and unavailable model verification as declared errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('connection')))
  expect(await classifySeparatedPair(options)).toEqual({
    error: {code: 'inspection-request-failed'},
    ok: false,
  })
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValueOnce(response(decision)).mockResolvedValueOnce(response(selected)),
  )
  vi.mocked(resolveQuestionModel).mockResolvedValue({
    error: {code: 'question-model-unavailable'},
    ok: false,
  })
  expect(await classifySeparatedPair(options)).toEqual({
    error: {code: 'inspection-model-changed'},
    ok: false,
  })
})
it('should permit absent evidence for uncertainty and resolve later passages exactly', async () => {
  vi.mocked(resolveQuestionModel).mockResolvedValue({ok: true, value: options.model})
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response({...decision, kind: 'uncertain'}))
      .mockResolvedValueOnce(response({leftEvidence: 'none', rightEvidence: 'none'}))
      .mockResolvedValueOnce(response(decision))
      .mockResolvedValueOnce(response({...selected, leftEvidence: 'left-2'})),
  )
  expect(await classifySeparatedPair(options)).toEqual({
    ok: true,
    value: {...decision, kind: 'uncertain', leftQuote: '', rightQuote: ''},
  })
  expect(
    await classifySeparatedPair({
      ...options,
      pair: {
        ...options.pair,
        left: {
          ...options.pair.left,
          payload: {...payload, text: `${'x'.repeat(800)}Exact passage.`},
        },
      },
    }),
  ).toEqual({ok: true, value: {...decision, leftQuote: 'Exact passage.', rightQuote: payload.text}})
})
it('should preserve the first decision during evidence selection', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(response(decision))
    .mockResolvedValueOnce(response(selected))
  vi.stubGlobal('fetch', fetch)
  vi.mocked(resolveQuestionModel).mockResolvedValue({ok: true, value: options.model})
  expect(await classifySeparatedPair(options)).toEqual({
    ok: true,
    value: {...decision, leftQuote: payload.text, rightQuote: payload.text},
  })
  const first = JSON.parse(fetch.mock.calls[0][1].body)
  const second = JSON.parse(fetch.mock.calls[1][1].body)
  expect(Object.keys(first.format.properties).sort()).toEqual(['confidence', 'kind', 'reason'])
  expect(Object.keys(second.format.properties).sort()).toEqual(['leftEvidence', 'rightEvidence'])
  expect(second.prompt).toContain(JSON.stringify(decision))
})
it.each([
  {...selected, kind: 'unrelated'},
  {...selected, leftEvidence: 'right-1'},
  {...selected, leftEvidence: 'none'},
  {...selected, rightEvidence: 'invented'},
])('should reject invalid evidence without revising the first decision: %j', async (selection) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValueOnce(response(decision)).mockResolvedValueOnce(response(selection)),
  )
  expect(await classifySeparatedPair(options)).toEqual({
    error: {code: 'invalid-inspection-response'},
    ok: false,
  })
})
it('should stop before evidence selection when the decision is invalid', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response({...decision, confidence: 2}))
  vi.stubGlobal('fetch', fetch)
  expect(await classifySeparatedPair(options)).toEqual({
    error: {code: 'invalid-inspection-response'},
    ok: false,
  })
  expect(fetch).toHaveBeenCalledTimes(1)
})
it('should reject changed model identity after both requests', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValueOnce(response(decision)).mockResolvedValueOnce(response(selected)),
  )
  vi.mocked(resolveQuestionModel).mockResolvedValue({
    ok: true,
    value: {...options.model, digest: 'b'.repeat(64)},
  })
  expect(await classifySeparatedPair(options)).toEqual({
    error: {code: 'inspection-model-changed'},
    ok: false,
  })
})
