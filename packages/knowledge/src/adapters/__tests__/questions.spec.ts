import {afterEach, describe, expect, it, vi} from 'vitest'
import {generateQuestions, resolveQuestionModel} from '../questions'

const identity = {digest: 'a'.repeat(64), name: 'test:latest'}
const tags = {models: [{...identity, capabilities: ['completion']}]}
const questions = {en: 'When should a token refresh?', ko: '토큰은 언제 갱신하나?'}
const options = {
  baseUrl: 'http://localhost:11434/prefix',
  model: identity,
  source: {
    contentHash: `sha256:${'b'.repeat(64)}`,
    docId: 'auth',
    text: 'Refresh once.',
    title: 'Auth',
    unitId: 'refresh',
  },
}
afterEach(() => {
  vi.unstubAllGlobals()
})
describe('resolveQuestionModel', () => {
  it('should resolve latest aliases and reject missing or embedding-only models', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(tags))
      .mockResolvedValueOnce(Response.json({models: [{...identity, capabilities: ['embedding']}]}))
      .mockResolvedValueOnce(Response.json({models: []}))
    vi.stubGlobal('fetch', fetch)
    expect(await resolveQuestionModel({baseUrl: options.baseUrl, model: 'test'})).toEqual({
      ok: true,
      value: identity,
    })
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:11434/prefix/api/tags')
    expect(await resolveQuestionModel({baseUrl: options.baseUrl, model: 'test'})).toMatchObject({
      ok: false,
    })
    expect(await resolveQuestionModel({baseUrl: options.baseUrl, model: 'test'})).toMatchObject({
      ok: false,
    })
  })
})
describe('generateQuestions', () => {
  it('should reject oversized sources before requests and normalize HTTP and malformed tag responses', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('secret', {status: 500}))
      .mockResolvedValueOnce(Response.json({models: 'invalid'}))
      .mockResolvedValueOnce(new Response('', {status: 503}))
    vi.stubGlobal('fetch', fetch)
    expect(
      await generateQuestions({...options, source: {...options.source, text: 'x'.repeat(8001)}}),
    ).toMatchObject({ok: false})
    expect(fetch).not.toHaveBeenCalled()
    expect(await generateQuestions(options)).toMatchObject({ok: false})
    expect(await resolveQuestionModel({baseUrl: options.baseUrl, model: 'test'})).toMatchObject({
      ok: false,
    })
    expect(await resolveQuestionModel({baseUrl: options.baseUrl, model: 'test'})).toMatchObject({
      ok: false,
    })
  })
  it('should request structured questions with bounded generation and verify model digest', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({done: true, model: identity.name, response: JSON.stringify(questions)}),
      )
      .mockResolvedValueOnce(Response.json(tags))
    vi.stubGlobal('fetch', fetch)
    expect(await generateQuestions(options)).toEqual({ok: true, value: questions})
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      format: {required: ['ko', 'en'], type: 'object'},
      model: identity.name,
      options: {temperature: 0},
      stream: false,
    })
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })
  it.each([
    {done: false, model: identity.name, response: '{}'},
    {done: true, done_reason: 'length', model: identity.name, response: JSON.stringify(questions)},
    {done: true, model: identity.name, response: 'not json'},
    {
      done: true,
      model: identity.name,
      response: JSON.stringify({...questions, expected: 'attacker'}),
    },
  ])(
    'should reject incomplete or invalid output without reporting source text',
    async (response) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(response)))
      expect(await generateQuestions(options)).toMatchObject({ok: false})
    },
  )
  it('should reject digest changes and normalize transport errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({done: true, model: identity.name, response: JSON.stringify(questions)}),
        )
        .mockResolvedValueOnce(Response.json({models: [{...identity, digest: 'c'.repeat(64)}]})),
    )
    expect(await generateQuestions(options)).toEqual({
      error: {code: 'question-model-changed'},
      ok: false,
    })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret')))
    expect(await generateQuestions(options)).toEqual({
      error: {code: 'question-generation-failed'},
      ok: false,
    })
    expect(await resolveQuestionModel({baseUrl: options.baseUrl, model: 'test'})).toEqual({
      error: {code: 'question-model-unavailable'},
      ok: false,
    })
  })
})
