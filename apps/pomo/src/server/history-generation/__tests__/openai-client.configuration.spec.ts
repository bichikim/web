import {afterEach, expect, it, vi} from 'vitest'
import OpenAI from 'openai'

import {HISTORY_SOURCE_POLICY} from 'src/features/history-generation'
import {HistorySubmissionError, submitHistoryResponse} from '../openai-client'

const environmentMocks = vi.hoisted(() => ({
  env: {
    OPENAI_API_KEY: 'sk-test-secret',
    OPENAI_MODEL: 'gpt-5.6-luna',
    OPENAI_REASONING_EFFORT: 'medium' as string,
    OPENAI_SERVICE_TIER: 'default' as const,
    OPENAI_WEBHOOK_SECRET: 'webhook-secret',
  },
}))

vi.mock('src/env', () => ({
  env: environmentMocks.env,
}))

afterEach(() => {
  environmentMocks.env.OPENAI_MODEL = 'gpt-5.6-luna'
  environmentMocks.env.OPENAI_REASONING_EFFORT = 'medium'
})

const OPTIONS = {
  generationRunId: 'run-1',
  policy: HISTORY_SOURCE_POLICY,
  promptVersion: 'history-prompt-v1',
  submissionKey: '019d0000-0000-7000-8000-000000000001',
  targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
}

it('should preserve minimal reasoning for a configured model that supports it', async () => {
  environmentMocks.env.OPENAI_MODEL = 'gpt-5'
  environmentMocks.env.OPENAI_REASONING_EFFORT = 'minimal'
  const create = vi.fn().mockResolvedValue({id: 'resp-1'})
  const client = {responses: {create}} as unknown as OpenAI

  await expect(submitHistoryResponse(OPTIONS, client)).resolves.toEqual({responseId: 'resp-1'})
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      reasoning: {effort: 'minimal'},
    }),
    {maxRetries: 0},
  )
})

it('should reject minimal reasoning for the default GPT-5.6 model', async () => {
  environmentMocks.env.OPENAI_REASONING_EFFORT = 'minimal'
  const create = vi.fn()
  const client = {responses: {create}} as unknown as OpenAI

  const result = await submitHistoryResponse(OPTIONS, client).catch((caught: unknown) => caught)

  expect(result).toBeInstanceOf(HistorySubmissionError)
  if (!(result instanceof HistorySubmissionError)) {
    throw new TypeError('Expected a HistorySubmissionError')
  }
  expect(result.cause).toBeInstanceOf(TypeError)
  expect(String(result.cause)).toContain(
    'OPENAI_REASONING_EFFORT cannot be minimal when OPENAI_MODEL is GPT-5.6',
  )
  expect(create).not.toHaveBeenCalled()
})
