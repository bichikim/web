import {beforeEach, expect, it, vi} from 'vitest'

const openAiMocks = vi.hoisted(() => ({
  constructor: vi.fn(),
  create: vi.fn(),
  unwrap: vi.fn(),
}))
const environmentMocks = vi.hoisted(() => ({
  getOpenAiConfiguration: vi.fn(),
  getOpenAiWebhookSecret: vi.fn(),
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
vi.mock('../../ai/environment', () => environmentMocks)

import {HISTORY_SOURCE_POLICY} from 'src/features/history-generation'
import {getOpenAiClient, submitHistoryResponse, unwrapOpenAiWebhook} from '../openai-client'

beforeEach(() => {
  vi.clearAllMocks()
  environmentMocks.getOpenAiConfiguration.mockReturnValue({
    apiKey: 'test-key',
    model: 'gpt-5.5',
    reasoningEffort: 'medium',
    serviceTier: 'default',
  })
  environmentMocks.getOpenAiWebhookSecret.mockReturnValue('webhook-secret')
  openAiMocks.create.mockResolvedValue({id: 'resp-default'})
  openAiMocks.unwrap.mockReturnValue({id: 'event-1'})
})

it('should lazily reuse the default OpenAI client for submissions', async () => {
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
  ).resolves.toEqual({responseId: 'resp-default'})
  expect(openAiMocks.constructor).toHaveBeenCalledOnce()
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
