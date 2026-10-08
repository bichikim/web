/** @vitest-environment node */
// oxlint-disable eslint-js/camelcase -- These assertions exercise the provider wire contract.
import {expect, it, vi} from 'vitest'
import {createOpenRouterAdapter} from '../create-openrouter-adapter'
import {classifyApiAiSubmissionError} from '../submission-error'
import type {ApiAiProvider} from '../types'

const provider: ApiAiProvider = {
  apiKey: 'key',
  baseUrl: 'https://openrouter.ai/api/v1',
  id: 'openrouter',
  models: {'cloud-text': 'google/gemma-4-26b-a4b-it:free'},
  poolId: 'router',
  protocol: 'openrouter-responses-queue',
}
const completed = {
  id: 'resp_router',
  model: 'google/gemma-4-26b-a4b-it:free',
  object: 'response',
  output: [{content: [{text: '새로운 시작을 준비하세요.', type: 'output_text'}], type: 'message'}],
  status: 'completed',
  usage: {input_tokens: 10, output_tokens: 20, total_tokens: 30},
}

it('should send a complete stateless request and normalize Korean text and usage', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(completed))
  const adapter = createOpenRouterAdapter({fetch})
  const metadata = {pomo_api_attempt_id: 'attempt', pomo_api_job_id: 'job'}
  expect(
    await adapter.submit(
      provider,
      {
        background: true,
        input: [{content: '질문과 카드 세 장', role: 'user'}],
        max_output_tokens: 100,
        metadata,
        previous_response_id: 'old',
        reasoning: {effort: 'none'},
        store: true,
      },
      'attempt',
    ),
  ).toMatchObject({
    metadata,
    outputText: '새로운 시작을 준비하세요.',
    status: 'completed',
    tokenCount: 30,
  })
  const [url, options] = fetch.mock.calls[0]
  expect(String(url)).toBe('https://openrouter.ai/api/v1/responses')
  const body = JSON.parse(options.body)
  expect(body).toMatchObject({
    background: false,
    max_output_tokens: 100,
    provider: {sort: 'price'},
    store: false,
    stream: false,
  })
  expect(body.previous_response_id).toBeUndefined()
  expect(body.reasoning).toBeUndefined()
  expect(body.model).toBe(provider.models['cloud-text'])
  expect(fetch).toHaveBeenCalledOnce()
})

it('should preserve a confirmed 429 without hidden SDK retries', async () => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json(
      {error: {code: 429, message: 'limited'}},
      {
        headers: {'Retry-After': '60'},
        status: 429,
      },
    ),
  )
  const adapter = createOpenRouterAdapter({fetch})
  const error = await adapter
    .submit(provider, {input: 'hello'}, 'attempt')
    .catch((cause: unknown) => cause)
  expect(classifyApiAiSubmissionError(error, 0)).toMatchObject({
    acceptance: 'rejected',
    fallback: true,
    retryAt: 60_000,
  })
  expect(fetch).toHaveBeenCalledOnce()
})

it.each([
  {output: [], usage: completed.usage},
  {output: completed.output, usage: undefined},
])('should fail an incomplete result without billing success', async (invalid) => {
  const adapter = createOpenRouterAdapter({
    fetch: vi.fn().mockResolvedValue(Response.json({...completed, ...invalid})),
  })
  expect(await adapter.submit(provider, {input: 'hello'}, 'attempt')).toMatchObject({
    failureCode: 'invalid_completion',
    fallback: false,
    status: 'failed',
  })
})

it('should reject a nonterminal response because OpenRouter cannot retrieve it later', async () => {
  const adapter = createOpenRouterAdapter({
    fetch: vi.fn().mockResolvedValue(Response.json({...completed, status: 'queued'})),
  })
  await expect(adapter.submit(provider, {input: 'hello'}, 'attempt')).rejects.toThrow('terminal')
})

it('should isolate concurrent adapters and preserve each selected model', async () => {
  const firstFetch = vi.fn().mockResolvedValue(Response.json(completed))
  const secondFetch = vi
    .fn()
    .mockResolvedValue(Response.json({...completed, model: 'second-model'}))
  const [first, second] = await Promise.all([
    createOpenRouterAdapter({fetch: firstFetch}).submit(
      provider,
      {input: 'hello', model: 'first-model'},
      'first',
    ),
    createOpenRouterAdapter({fetch: secondFetch}).submit(
      provider,
      {input: 'hello', model: 'second-model'},
      'second',
    ),
  ])
  expect(first.model).toBe(completed.model)
  expect(second.model).toBe('second-model')
  expect(firstFetch).toHaveBeenCalledOnce()
  expect(secondFetch).toHaveBeenCalledOnce()
  expect(JSON.parse(firstFetch.mock.calls[0][1].body).model).toBe('first-model')
  expect(JSON.parse(secondFetch.mock.calls[0][1].body).model).toBe('second-model')
})
