/** @vitest-environment node */
import {ApiAiAdmissionError} from 'src/server/api-ai/admission-error'
import {beforeEach, expect, it, vi} from 'vitest'

const openAiMocks = vi.hoisted(() => ({
  constructor: vi.fn(),
  create: vi.fn(),
  queued: vi.fn(),
  unwrap: vi.fn(),
}))
const environmentMocks = vi.hoisted(() => ({
  env: {
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'gpt-5.5',
    OPENAI_REASONING_EFFORT: 'medium',
    OPENAI_SERVICE_TIER: 'default',
    OPENAI_WEBHOOK_SECRET: 'webhook-secret',
  },
}))

vi.mock('src/server/api-ai/submit-queued-history-response', () => ({
  submitQueuedHistoryResponse: openAiMocks.queued,
}))
vi.mock('openai', () => ({
  default: class OpenAI {
    readonly responses = {create: openAiMocks.create}
    readonly webhooks = {unwrap: openAiMocks.unwrap}

    constructor(options: unknown) {
      openAiMocks.constructor(options)
    }
  },
}))
vi.mock('src/env', () => ({
  env: environmentMocks.env,
}))

import {HISTORY_SOURCE_POLICY} from 'src/features/history-generation'
import {getOpenAiClient, submitHistoryResponse, unwrapOpenAiWebhook} from '../openai-client'

beforeEach(() => {
  vi.clearAllMocks()
  openAiMocks.queued.mockResolvedValue({
    responseId: 'pomo-api:019d0000-0000-7000-8000-000000000001',
  })
  openAiMocks.unwrap.mockReturnValue({id: 'event-1'})
})

it('should reuse the client for legacy lookups while queueing new history submissions', async () => {
  const firstClient = getOpenAiClient()

  expect(getOpenAiClient()).toBe(firstClient)
  await expect(
    submitHistoryResponse({
      generationRunId: 'run-1',
      policy: HISTORY_SOURCE_POLICY,
      promptVersion: 'history-prompt-v1',
      submissionKey: '019d0000-0000-7000-8000-000000000001',
      targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
    }),
  ).resolves.toEqual({responseId: 'pomo-api:019d0000-0000-7000-8000-000000000001'})
  expect(openAiMocks.constructor).toHaveBeenCalledOnce()
  expect(openAiMocks.create).not.toHaveBeenCalled()
  expect(openAiMocks.queued).toHaveBeenCalledWith(
    '019d0000-0000-7000-8000-000000000001',
    expect.objectContaining({background: true, store: true}),
  )
})

it('should unwrap a webhook with the configured secret', () => {
  const headers = new Headers({'webhook-id': 'event-1'})

  expect(unwrapOpenAiWebhook('{"type":"response.completed"}', headers)).toEqual({id: 'event-1'})
  expect(openAiMocks.unwrap).toHaveBeenCalledWith(
    '{"type":"response.completed"}',
    headers,
    'webhook-secret',
  )
})

it('should classify local queue admission failure as rejected without sending an API request', async () => {
  openAiMocks.queued.mockRejectedValueOnce(new ApiAiAdmissionError('queue full'))
  await expect(
    submitHistoryResponse({
      generationRunId: 'run-1',
      policy: HISTORY_SOURCE_POLICY,
      promptVersion: 'v1',
      submissionKey: '019d0000-0000-7000-8000-000000000001',
      targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
    }),
  ).rejects.toMatchObject({acceptance: 'rejected'})
  expect(openAiMocks.create).not.toHaveBeenCalled()
})
