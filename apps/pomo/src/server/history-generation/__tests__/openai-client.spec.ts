import {afterEach, expect, it, vi} from 'vitest'
import OpenAI from 'openai'

import {HISTORY_SOURCE_POLICY} from 'src/features/history-generation'
import {HistorySubmissionError, submitHistoryResponse} from '../openai-client'

const environmentMocks = vi.hoisted(() => ({
  env: {
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'gpt-5.5',
    OPENAI_REASONING_EFFORT: 'medium' as const,
    OPENAI_SERVICE_TIER: 'default' as const,
    OPENAI_WEBHOOK_SECRET: 'webhook-secret',
  },
}))

vi.mock('src/env', () => ({
  env: environmentMocks.env,
}))

afterEach(() => {
  vi.clearAllMocks()
  environmentMocks.env.OPENAI_API_KEY = 'test-key'
  environmentMocks.env.OPENAI_MODEL = 'gpt-5.5'
  environmentMocks.env.OPENAI_REASONING_EFFORT = 'medium'
  environmentMocks.env.OPENAI_SERVICE_TIER = 'default'
})

const OPTIONS = {
  generationRunId: 'run-1',
  policy: HISTORY_SOURCE_POLICY,
  promptVersion: 'history-prompt-v1',
  submissionKey: '019d0000-0000-7000-8000-000000000001',
  targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
}

it('should disable SDK retries and include the submission correlation key', async () => {
  const create = vi.fn().mockResolvedValue({id: 'resp-1'})
  const client = {responses: {create}} as unknown as OpenAI

  await expect(submitHistoryResponse(OPTIONS, client)).resolves.toEqual({responseId: 'resp-1'})
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      metadata: expect.objectContaining({
        submission_key: '019d0000-0000-7000-8000-000000000001',
      }),
    }),
    {maxRetries: 0},
  )
})

it('should include required titles in request metadata', async () => {
  const create = vi.fn().mockResolvedValue({id: 'resp-1'})
  const client = {responses: {create}} as unknown as OpenAI

  await submitHistoryResponse({...OPTIONS, requiredTitles: ['첫 사건', '둘째 사건']}, client)

  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      metadata: expect.objectContaining({
        required_titles: JSON.stringify(['첫 사건', '둘째 사건']),
      }),
    }),
    {maxRetries: 0},
  )
})

it('should classify a client error response as a confirmed rejection', async () => {
  const error = new OpenAI.BadRequestError(
    400,
    {message: 'Invalid request'},
    undefined,
    new Headers(),
  )
  const client = {
    responses: {create: vi.fn().mockRejectedValue(error)},
  } as unknown as OpenAI

  const result = await submitHistoryResponse(OPTIONS, client).catch((caught: unknown) => caught)

  expect(result).toBeInstanceOf(HistorySubmissionError)
  if (!(result instanceof HistorySubmissionError)) {
    throw new TypeError('Expected a HistorySubmissionError')
  }
  expect(result).toMatchObject({acceptance: 'rejected', name: HistorySubmissionError.name})
  expect(result.cause).toBe(error)
})

it('should classify a transport error as having unknown acceptance', async () => {
  const error = new OpenAI.APIConnectionError({cause: new Error('Response lost')})
  const client = {
    responses: {create: vi.fn().mockRejectedValue(error)},
  } as unknown as OpenAI

  const result = await submitHistoryResponse(OPTIONS, client).catch((caught: unknown) => caught)

  expect(result).toBeInstanceOf(HistorySubmissionError)
  if (!(result instanceof HistorySubmissionError)) {
    throw new TypeError('Expected a HistorySubmissionError')
  }
  expect(result).toMatchObject({acceptance: 'unknown', name: HistorySubmissionError.name})
  expect(result.cause).toBe(error)
})

it.each([
  new OpenAI.APIError(408, {message: 'timeout'}, undefined, new Headers()),
  new OpenAI.APIError(500, {message: 'server error'}, undefined, new Headers()),
  new OpenAI.APIError(undefined, {message: 'unknown'}, undefined, new Headers()),
])('should keep acceptance unknown for an inconclusive API failure', async (error) => {
  const client = {
    responses: {create: vi.fn().mockRejectedValue(error)},
  } as unknown as OpenAI

  await expect(submitHistoryResponse(OPTIONS, client)).rejects.toMatchObject({
    acceptance: 'unknown',
  })
})

it('should use a stable message for a non-Error submission failure', () => {
  expect(new HistorySubmissionError('unknown', null).message).toBe(
    'Unknown OpenAI submission error',
  )
})

it('should classify a preflight configuration error as a confirmed rejection', async () => {
  const error = new Error('OPENAI_API_KEY is required')
  Object.defineProperty(environmentMocks.env, 'OPENAI_API_KEY', {
    configurable: true,
    get() {
      throw error
    },
  })
  const create = vi.fn()
  const client = {responses: {create}} as unknown as OpenAI

  const result = await submitHistoryResponse(OPTIONS, client).catch((caught: unknown) => caught)

  Object.defineProperty(environmentMocks.env, 'OPENAI_API_KEY', {
    configurable: true,
    value: 'test-key',
    writable: true,
  })

  expect(result).toBeInstanceOf(HistorySubmissionError)
  if (!(result instanceof HistorySubmissionError)) {
    throw new TypeError('Expected a HistorySubmissionError')
  }
  expect(result).toMatchObject({acceptance: 'rejected', name: HistorySubmissionError.name})
  expect(result.cause).toBe(error)
  expect(create).not.toHaveBeenCalled()
})
