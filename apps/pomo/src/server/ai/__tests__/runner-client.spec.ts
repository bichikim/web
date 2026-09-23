/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'

const environmentMocks = vi.hoisted(() => ({
  env: {
    POMO_AI_RUNNER_TIMEOUT_MS: 1000,
    POMO_AI_RUNNER_TOKEN: undefined as string | undefined,
    POMO_AI_RUNNER_URL: undefined as string | undefined,
  },
}))

vi.mock('src/env', () => ({env: environmentMocks.env}))

import {createAiRunnerClient} from '../runner-client'
import {createAiRunnerJobRequest} from '../runner-contract'

afterEach(() => vi.restoreAllMocks())

describe('AI runner client', () => {
  it('submits a versioned request with bearer authentication and parses the response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({jobId: 'runner-job-1'}))
    const client = createAiRunnerClient({
      baseUrl: 'https://runner.example.test',
      fetcher,
      timeoutMs: 1000,
      token: 'runner-token',
    })

    await expect(
      client.submit(
        createAiRunnerJobRequest({
          capability: 'text',
          input: {messages: []},
          jobId: '019d0000-0000-7000-8000-000000000001',
          modelId: 'gemma-4-e2b',
        }),
      ),
    ).resolves.toEqual({jobId: 'runner-job-1'})
    expect(fetcher).toHaveBeenCalledWith(
      'https://runner.example.test/v1/jobs',
      expect.objectContaining({
        body: expect.stringContaining('gemma-4-e2b'),
        method: 'POST',
        signal: expect.any(AbortSignal),
      }),
    )
    const request = fetcher.mock.calls[0]?.[1]
    expect(new Headers(request?.headers).get('Authorization')).toBe('Bearer runner-token')
  })

  it('keeps an absent runner configuration explicit', async () => {
    const client = createAiRunnerClient()

    await expect(client.getStatus('runner-job-1')).rejects.toMatchObject({
      code: 'unavailable',
      retryable: true,
    })
  })

  it('does not retry a definitive runner client rejection', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 400}))
    const client = createAiRunnerClient({
      baseUrl: 'https://runner.example.test',
      fetcher,
      timeoutMs: 1000,
      token: 'runner-token',
    })

    await expect(
      client.submit(
        createAiRunnerJobRequest({
          capability: 'text',
          input: {messages: []},
          jobId: '019d0000-0000-7000-8000-000000000001',
          modelId: 'gemma-4-e2b',
        }),
      ),
    ).rejects.toMatchObject({code: 'request-failed', retryable: false, status: 400})
  })

  it('bounds a runner status response before parsing it', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('x'.repeat(2_000_001), {status: 200}))
    const client = createAiRunnerClient({
      baseUrl: 'https://runner.example.test',
      fetcher,
      timeoutMs: 1000,
      token: 'runner-token',
    })

    await expect(client.getStatus('runner-job-1')).rejects.toMatchObject({
      code: 'invalid-response',
      retryable: false,
    })
  })
})
