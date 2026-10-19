/** @vitest-environment node */
// oxlint-disable eslint-js/camelcase -- Provider response wire fields.
import {expect, it, vi} from 'vitest'
import {testProviderModel} from '../test-provider-model'
import type {ApiAiProvider} from '../types'
const provider: ApiAiProvider = {
  apiKey: 'secret',
  baseUrl: 'https://openrouter.ai/api/v1',
  id: 'openrouter',
  models: {'cloud-text': 'default'},
  poolId: 'router',
  protocol: 'openrouter-responses-queue',
}
const completed = {
  id: 'response',
  model: 'actual-model',
  output: [{content: [{text: '안녕하세요!', type: 'output_text'}], type: 'message'}],
  status: 'completed',
  usage: {input_tokens: 5, output_tokens: 10, total_tokens: 15},
}
it('should test only the selected model with a stateless greeting and report the actual response', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(completed))
  const result = await testProviderModel(provider, 'selected-model', {fetch})
  expect(result).toMatchObject({
    kind: 'success',
    modelId: 'actual-model',
    text: '안녕하세요!',
    tokenCount: 15,
  })
  expect(fetch).toHaveBeenCalledOnce()
  const [url, options] = fetch.mock.calls[0]
  expect(String(url)).toBe('https://openrouter.ai/api/v1/responses')
  expect(JSON.parse(options.body)).toMatchObject({
    background: false,
    input: '안녕! 한국어로 짧게 한 문장으로 인사해 줘.',
    model: 'selected-model',
    provider: {sort: 'price'},
    store: false,
    stream: false,
  })
})
it('should return provider rejection details without retrying or falling back', async () => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json(
      {
        error: {
          code: 429,
          message: 'Provider returned error',
          metadata: {provider_name: 'Example', raw: 'Shared capacity exhausted'},
        },
      },
      {headers: {'Retry-After': '60'}, status: 429},
    ),
  )
  expect(await testProviderModel(provider, 'selected-model', {fetch})).toMatchObject({
    details: 'Shared capacity exhausted',
    kind: 'failure',
    message: '429 Provider returned error',
    retryAfter: '60',
    status: 429,
  })
  expect(fetch).toHaveBeenCalledOnce()
})
it('should report an empty response as a failed test', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({...completed, output: []}))
  expect(await testProviderModel(provider, 'selected-model', {fetch})).toMatchObject({
    kind: 'failure',
  })
})

it('should keep OpenRouter provider sorting out of direct OpenAI test requests', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(completed))
  await testProviderModel(
    {
      ...provider,
      baseUrl: 'https://api.openai.com/v1',
      id: 'openai',
      protocol: 'openai-responses-background',
    },
    'selected-model',
    {fetch},
  )
  const [url, options] = fetch.mock.calls[0]
  expect(String(url)).toBe('https://api.openai.com/v1/responses')
  expect(JSON.parse(options.body)).not.toHaveProperty('provider')
  expect(JSON.parse(options.body).model).toBe('selected-model')
})

it('should isolate transports for concurrent model tests', async () => {
  const firstFetch = vi.fn().mockResolvedValue(Response.json(completed))
  const secondFetch = vi
    .fn()
    .mockResolvedValue(Response.json({...completed, model: 'second-model'}))
  const [first, second] = await Promise.all([
    testProviderModel(provider, 'first-model', {fetch: firstFetch}),
    testProviderModel(provider, 'second-model', {fetch: secondFetch}),
  ])
  expect(first).toMatchObject({kind: 'success', modelId: 'actual-model'})
  expect(second).toMatchObject({kind: 'success', modelId: 'second-model'})
  expect(firstFetch).toHaveBeenCalledOnce()
  expect(secondFetch).toHaveBeenCalledOnce()
  expect(JSON.parse(firstFetch.mock.calls[0][1].body).model).toBe('first-model')
  expect(JSON.parse(secondFetch.mock.calls[0][1].body).model).toBe('second-model')
})
