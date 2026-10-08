/** @vitest-environment node */
import {createHmac} from 'node:crypto'
import {afterEach, expect, it, vi} from 'vitest'
import {responsesAdapter, unwrapApiAiWebhook} from '../responses-adapter'
import {classifyApiAiSubmissionError} from '../submission-error'
import type {ApiAiProvider} from '../types'

const provider: ApiAiProvider = {
  apiKey: 'key',
  baseUrl: 'https://secondary.example/v1',
  concurrency: 1,
  id: 'secondary',
  models: {'cloud-text': 'model'},
  poolId: 'secondary',
  webhookSecret: `whsec_${Buffer.from('test-secret').toString('base64')}`,
}
const queued = {
  id: 'resp_1',
  metadata: {pomo_api_job_id: 'job'},
  model: 'model',
  object: 'response',
  output: [],
  status: 'queued',
}
afterEach(() => {
  vi.unstubAllGlobals()
})
it('should send a background stored request with stable attempt idempotency to the chosen API', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(queued))
  vi.stubGlobal('fetch', fetch)
  expect(
    await responsesAdapter.submit(
      provider,
      {background: false, input: 'hello', max_output_tokens: 100, store: false},
      'attempt',
    ),
  ).toMatchObject({responseId: 'resp_1', status: 'queued', tokenCount: null})
  const [url, options] = fetch.mock.calls[0]
  expect(String(url)).toBe('https://secondary.example/v1/responses')
  expect(JSON.parse(options.body)).toMatchObject({
    background: true,
    max_output_tokens: 100,
    store: true,
  })
  expect(new Headers(options.headers).get('Idempotency-Key')).toBe('attempt')
})
it('should preserve a rate rejection for fallback without hidden SDK retries', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        {error: {code: 'rate_limit_exceeded', message: 'limited'}},
        {headers: {'Retry-After': '90'}, status: 429},
      ),
    )
  vi.stubGlobal('fetch', fetch)
  const error = await responsesAdapter
    .submit(provider, {input: 'hello'}, 'attempt')
    .catch((cause: unknown) => cause)
  expect(classifyApiAiSubmissionError(error, 1000)).toMatchObject({
    acceptance: 'rejected',
    fallback: true,
    retryAt: 91000,
  })
  expect(fetch).toHaveBeenCalledOnce()
})
it('should reject a complete result with missing usage instead of recording a free success', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      Response.json({
        ...queued,
        output: [
          {content: [{annotations: [], text: 'hello', type: 'output_text'}], type: 'message'},
        ],
        status: 'completed',
      }),
    ),
  )
  expect(await responsesAdapter.retrieve(provider, 'resp_1')).toMatchObject({
    failureCode: 'invalid_completion',
    fallback: false,
    status: 'failed',
  })
})
it('should verify an authentic provider callback and reject a modified body', async () => {
  const body = JSON.stringify({
    data: {id: 'resp_1'},
    id: 'evt_1',
    object: 'event',
    type: 'response.completed',
  })
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = createHmac('sha256', Buffer.from('test-secret'))
    .update(`evt_1.${timestamp}.${body}`)
    .digest('base64')
  const headers = new Headers({
    'webhook-id': 'evt_1',
    'webhook-signature': `v1,${signature}`,
    'webhook-timestamp': timestamp,
  })
  expect(await unwrapApiAiWebhook(provider, body, headers)).toMatchObject({
    data: {id: 'resp_1'},
    id: 'evt_1',
    type: 'response.completed',
  })
  await expect(
    unwrapApiAiWebhook(provider, body.replace('resp_1', 'resp_2'), headers),
  ).rejects.toThrow()
})

it.each([-1, 0.5, '10', null, 2147483648])(
  'should reject invalid completion usage %s before persistence',
  async (tokens) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          ...queued,
          output: [
            {content: [{annotations: [], text: 'hello', type: 'output_text'}], type: 'message'},
          ],
          status: 'completed',
          usage: {total_tokens: tokens},
        }),
      ),
    )
    expect(await responsesAdapter.retrieve(provider, 'resp_1')).toMatchObject({
      failureCode: 'invalid_completion',
      fallback: false,
      status: 'failed',
      tokenCount: null,
    })
  },
)

it.each([0, 10, 2147483647])(
  'should preserve completed output and valid integer usage %s',
  async (tokens) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          ...queued,
          output: [
            {content: [{annotations: [], text: 'hello', type: 'output_text'}], type: 'message'},
          ],
          status: 'completed',
          usage: {total_tokens: tokens},
        }),
      ),
    )
    expect(await responsesAdapter.retrieve(provider, 'resp_1')).toMatchObject({
      failureCode: null,
      outputText: 'hello',
      status: 'completed',
      tokenCount: tokens,
    })
  },
)
