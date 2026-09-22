/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  env: {
    OPENAI_MODEL: 'gpt-5.6-luna',
    OPENAI_REASONING_EFFORT: 'medium',
    POMO_AI_RUNNER_TIMEOUT_MS: 120_000,
  },
  getOpenAiClient: vi.fn(),
}))

vi.mock('src/env', () => ({env: mocks.env}))
vi.mock('src/server/history-generation/openai-client', () => ({
  getOpenAiClient: mocks.getOpenAiClient,
}))

import {LunaTextSubmissionError, submitLunaTextJob} from '../openai-text'

const JOB_ID = '019d0000-0000-7000-8000-000000000001'
const REQUEST = {
  messages: [{content: '안녕', role: 'user'}],
  parameters: {},
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getOpenAiClient.mockReturnValue({
    responses: {create: vi.fn().mockResolvedValue({id: 'response-1'})},
  })
})

describe('OpenAI text submission', () => {
  it('uses the Pomo job ID as the OpenAI idempotency key and bounds the request', async () => {
    const client = mocks.getOpenAiClient()

    await expect(submitLunaTextJob(JOB_ID, REQUEST)).resolves.toEqual({responseId: 'response-1'})
    expect(client.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        background: true,
        max_output_tokens: 4096,
        metadata: {pomo_ai_job_id: JOB_ID},
      }),
      {idempotencyKey: JOB_ID, maxRetries: 0, timeout: 120_000},
    )
  })

  it('marks transport failures as retryable because background acceptance is ambiguous', async () => {
    const error = new Error('response lost')
    mocks.getOpenAiClient().responses.create.mockRejectedValue(error)

    const result = await submitLunaTextJob(JOB_ID, REQUEST).catch((caught: unknown) => caught)

    expect(result).toBeInstanceOf(LunaTextSubmissionError)
    expect(result).toMatchObject({retryable: true})
  })

  it('marks definitive client rejections as terminal', async () => {
    const error = Object.assign(new Error('invalid request'), {status: 400})
    mocks.getOpenAiClient().responses.create.mockRejectedValue(error)

    const result = await submitLunaTextJob(JOB_ID, REQUEST).catch((caught: unknown) => caught)

    expect(result).toBeInstanceOf(LunaTextSubmissionError)
    expect(result).toMatchObject({retryable: false})
  })
})
