import {afterEach, expect, it, vi} from 'vitest'
import {classifyInspectionPair} from '../inspection'
import {resolveQuestionModel} from '../questions'
import type {StoredKnowledgePoint} from '../../indexing/store'
vi.mock('../questions', () => ({resolveQuestionModel: vi.fn()}))
const point: StoredKnowledgePoint = {
  payload: {
    contentHash: 'hash',
    docId: 'auth',
    path: 'auth.md',
    relations: [],
    repoId: 'repo',
    status: 'active',
    tags: [],
    text: 'Refresh once.',
    title: 'Auth',
    type: 'rule',
    unitId: 'refresh',
    workspaceId: 'main',
  },
  pointId: 'a',
}
const options = {
  baseUrl: 'http://localhost:11434',
  model: {digest: 'a'.repeat(64), name: 'test:latest'},
  pair: {left: point, right: {...point, pointId: 'b'}},
}
const value = {
  confidence: 0.9,
  kind: 'duplicate',
  leftQuote: 'Refresh once.',
  reason: 'Same rule.',
  rightQuote: 'Refresh once.',
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
it('should request structured diagnostics and validate grounded quotes and model identity', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      Response.json({done: true, model: options.model.name, response: JSON.stringify(value)}),
    )
  vi.stubGlobal('fetch', fetch)
  vi.mocked(resolveQuestionModel).mockResolvedValue({ok: true, value: options.model})
  expect(await classifyInspectionPair(options)).toEqual({ok: true, value})
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
    format: {
      properties: {
        leftQuote: {maxLength: 800, type: 'string'},
        rightQuote: {maxLength: 800, type: 'string'},
      },
      type: 'object',
    },
    stream: false,
  })
  const {prompt} = JSON.parse(fetch.mock.calls[0][1].body)
  expect(prompt).toContain('Missing information is not a contradiction.')
  expect(prompt).toContain(
    'uncertain if definitions or conditions needed for comparison are missing',
  )
  expect(prompt).toContain('conflict only for explicit mutually incompatible claims')
  expect(prompt).toContain(
    'An undefined referenced rule about the shared subject requires uncertain, not unrelated.',
  )
  expect(prompt).toContain(
    'Choose unrelated for independent requirements or explicitly disjoint conditions.',
  )
  expect(prompt).toContain('Not specifying a requirement does not forbid it.')
  expect(prompt).toContain('Cite exact non-empty substrings from each text')
  expect(prompt).not.toContain('Select one evidence ID')
  expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
})
it('should reject oversized sources before model calls and normalize malformed JSON', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(Response.json({done: true, model: options.model.name, response: 'invalid'}))
  vi.stubGlobal('fetch', fetch)
  expect(
    await classifyInspectionPair({
      ...options,
      pair: {
        ...options.pair,
        left: {...point, payload: {...point.payload, text: 'x'.repeat(4001)}},
      },
    }),
  ).toEqual({error: {code: 'inspection-source-too-long'}, ok: false})
  expect(fetch).not.toHaveBeenCalled()
  expect(await classifyInspectionPair(options)).toEqual({
    error: {code: 'inspection-request-failed'},
    ok: false,
  })
})
it('should reject hallucinated quotes, unfinished output, HTTP failures and changed model bytes', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        done: true,
        model: options.model.name,
        response: JSON.stringify({...value, leftQuote: 'invented'}),
      }),
    )
    .mockResolvedValueOnce(Response.json({done: false}))
    .mockResolvedValueOnce(new Response('secret', {status: 500}))
    .mockResolvedValueOnce(
      Response.json({done: true, model: options.model.name, response: JSON.stringify(value)}),
    )
    .mockRejectedValueOnce(new Error('secret'))
  vi.stubGlobal('fetch', fetch)
  vi.mocked(resolveQuestionModel).mockResolvedValue({
    ok: true,
    value: {...options.model, digest: 'b'.repeat(64)},
  })
  expect(await classifyInspectionPair(options)).toMatchObject({
    error: {code: 'invalid-inspection-response'},
    ok: false,
  })
  expect(await classifyInspectionPair(options)).toMatchObject({ok: false})
  expect(await classifyInspectionPair(options)).toMatchObject({ok: false})
  expect(await classifyInspectionPair(options)).toMatchObject({
    error: {code: 'inspection-model-changed'},
    ok: false,
  })
  expect(await classifyInspectionPair(options)).toEqual({
    error: {code: 'inspection-request-failed'},
    ok: false,
  })
})
