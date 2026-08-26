import {afterEach, expect, it, vi} from 'vitest'
import OpenAI from 'openai'

import {HISTORY_SOURCE_POLICY} from 'src/features/history-generation'
import {getOpenAiConfiguration} from '../../ai/environment'
import {HistorySubmissionError, submitHistoryResponse} from '../openai-client'

vi.mock('../../ai/environment', () => ({
  getOpenAiConfiguration: vi.fn(),
  getOpenAiWebhookSecret: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

const mockConfiguration = () => {
  vi.mocked(getOpenAiConfiguration).mockReturnValue({
    apiKey: 'test-key',
    model: 'gpt-5.5',
    reasoningEffort: 'medium',
    serviceTier: 'default',
  })
}

const OPTIONS = {
  generationRunId: 'run-1',
  policy: HISTORY_SOURCE_POLICY,
  promptVersion: 'history-prompt-v1',
  submissionKey: '019d0000-0000-7000-8000-000000000001',
  targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
}

it('should disable SDK retries and include the submission correlation key', async () => {
  mockConfiguration()
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
  mockConfiguration()
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
  mockConfiguration()
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
  mockConfiguration()
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
  mockConfiguration()
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
  vi.mocked(getOpenAiConfiguration).mockImplementationOnce(() => {
    throw error
  })
  const create = vi.fn()
  const client = {responses: {create}} as unknown as OpenAI

  const result = await submitHistoryResponse(OPTIONS, client).catch((caught: unknown) => caught)

  expect(result).toBeInstanceOf(HistorySubmissionError)
  if (!(result instanceof HistorySubmissionError)) {
    throw new TypeError('Expected a HistorySubmissionError')
  }
  expect(result).toMatchObject({acceptance: 'rejected', name: HistorySubmissionError.name})
  expect(result.cause).toBe(error)
  expect(create).not.toHaveBeenCalled()
})
