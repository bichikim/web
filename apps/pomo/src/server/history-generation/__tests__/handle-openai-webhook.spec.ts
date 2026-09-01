import {afterEach, expect, it, vi} from 'vitest'
import {invalidateByTag} from '@vercel/functions'

import {
  HISTORY_SOURCE_POLICY,
  type HistoryGenerationOutput,
  validateHistoryOutput,
} from 'src/features/history-generation'

import {
  associateGenerationResponse,
  failHistoryResponse,
  findGenerationRun,
  publishHistoryResponse,
  rejectHistoryResponse,
} from '../generation-repository'
import {handleOpenAiResponseEvent} from '../handle-openai-webhook'
import {retrieveHistoryResponse} from '../response-result'

vi.mock('@vercel/functions', () => ({invalidateByTag: vi.fn()}))
vi.mock('src/features/history-generation', async () => {
  const actual = await vi.importActual<typeof import('src/features/history-generation')>(
    'src/features/history-generation',
  )

  return {...actual, validateHistoryOutput: vi.fn()}
})
vi.mock('../generation-repository', () => ({
  associateGenerationResponse: vi.fn(),
  failHistoryResponse: vi.fn(),
  findGenerationRun: vi.fn(),
  publishHistoryResponse: vi.fn(),
  rejectHistoryResponse: vi.fn(),
}))
vi.mock('../response-result', () => ({retrieveHistoryResponse: vi.fn()}))

const RUN = {
  id: 'run-1',
  openAiResponseId: 'resp-1',
  openAiSubmissionKey: '019d0000-0000-7000-8000-000000000001',
  sourcePolicyVersion: 'history-sources-v1',
  status: 'submitted' as const,
  submissionExpiresAt: null,
  submissionState: null,
  targetDate: '2026-08-16',
}

const FAILED_RESPONSE = {
  metadata: {
    generation_run_id: RUN.id,
    submission_key: RUN.openAiSubmissionKey,
  },
  model: 'gpt-5.5',
  outputText: '',
  responseId: 'resp-1',
  searchSourceUrls: [],
  status: 'failed' as const,
}

const GENERATION: HistoryGenerationOutput = {moments: []}

const COMPLETED_RESPONSE = {
  ...FAILED_RESPONSE,
  outputText: '{"moments":[]}',
  searchSourceUrls: ['https://example.com/source'],
  status: 'completed' as const,
}

const mockCompletedResponse = (
  response: Awaited<ReturnType<typeof retrieveHistoryResponse>> = COMPLETED_RESPONSE,
  run: NonNullable<Awaited<ReturnType<typeof findGenerationRun>>> = RUN,
): void => {
  vi.mocked(retrieveHistoryResponse).mockResolvedValue(response)
  vi.mocked(findGenerationRun).mockResolvedValue(run)
  vi.mocked(validateHistoryOutput).mockReturnValue(GENERATION)
}

afterEach(() => {
  vi.resetAllMocks()
})

it('should associate an unrecorded terminal response before marking it failed', async () => {
  vi.mocked(retrieveHistoryResponse).mockResolvedValue(FAILED_RESPONSE)
  vi.mocked(findGenerationRun).mockResolvedValue(undefined)
  vi.mocked(associateGenerationResponse).mockResolvedValue(RUN)

  await handleOpenAiResponseEvent({
    data: {id: 'resp-1'},
    id: 'event-1',
    type: 'response.failed',
  })

  expect(associateGenerationResponse).toHaveBeenCalledWith(
    'resp-1',
    RUN.id,
    RUN.openAiSubmissionKey,
  )
  expect(failHistoryResponse).toHaveBeenCalledWith(
    'event-1',
    'resp-1',
    'OpenAI ended with response.failed',
  )
})

it('should preserve stored-response webhook compatibility without submission metadata', async () => {
  vi.mocked(retrieveHistoryResponse).mockResolvedValue({
    ...FAILED_RESPONSE,
    metadata: {generation_run_id: RUN.id},
  })
  vi.mocked(findGenerationRun).mockResolvedValue(RUN)

  await handleOpenAiResponseEvent({
    data: {id: 'resp-1'},
    id: 'event-1',
    type: 'response.failed',
  })

  expect(associateGenerationResponse).not.toHaveBeenCalled()
  expect(failHistoryResponse).toHaveBeenCalledOnce()
  expect(publishHistoryResponse).not.toHaveBeenCalled()
  expect(rejectHistoryResponse).not.toHaveBeenCalled()
  expect(invalidateByTag).not.toHaveBeenCalled()
})

it('should reject a response from a different submission attempt', async () => {
  vi.mocked(retrieveHistoryResponse).mockResolvedValue({
    ...FAILED_RESPONSE,
    metadata: {...FAILED_RESPONSE.metadata, submission_key: 'different-submission'},
  })
  vi.mocked(findGenerationRun).mockResolvedValue(RUN)

  await expect(
    handleOpenAiResponseEvent({
      data: {id: 'resp-1'},
      id: 'event-1',
      type: 'response.failed',
    }),
  ).rejects.toThrow('does not match the generation submission')
  expect(failHistoryResponse).not.toHaveBeenCalled()
})

it.each(['response.cancelled', 'response.incomplete'] as const)(
  'should mark the run failed for terminal event %s',
  async (type) => {
    vi.mocked(retrieveHistoryResponse).mockResolvedValue(FAILED_RESPONSE)
    vi.mocked(findGenerationRun).mockResolvedValue(RUN)

    await handleOpenAiResponseEvent({data: {id: 'resp-1'}, id: `event-${type}`, type})

    expect(failHistoryResponse).toHaveBeenCalledWith(
      `event-${type}`,
      'resp-1',
      `OpenAI ended with ${type}`,
    )
  },
)

it('should safely delegate duplicate terminal events to repository idempotency', async () => {
  vi.mocked(retrieveHistoryResponse).mockResolvedValue(FAILED_RESPONSE)
  vi.mocked(findGenerationRun).mockResolvedValue(RUN)
  const event = {data: {id: 'resp-1'}, id: 'duplicate-event', type: 'response.failed' as const}

  await handleOpenAiResponseEvent(event)
  await handleOpenAiResponseEvent(event)

  expect(failHistoryResponse).toHaveBeenCalledTimes(2)
  expect(failHistoryResponse).toHaveBeenNthCalledWith(
    2,
    'duplicate-event',
    'resp-1',
    'OpenAI ended with response.failed',
  )
})

it.each([
  ['generation run id', {submission_key: RUN.openAiSubmissionKey}],
  ['submission key', {generation_run_id: RUN.id}],
] as const)('should reject association metadata without %s', async (_name, metadata) => {
  vi.mocked(retrieveHistoryResponse).mockResolvedValue({...FAILED_RESPONSE, metadata})
  vi.mocked(findGenerationRun).mockResolvedValue(undefined)

  await expect(
    handleOpenAiResponseEvent({
      data: {id: 'resp-1'},
      id: 'event-1',
      type: 'response.failed',
    }),
  ).rejects.toThrow('does not identify a generation submission')
  expect(associateGenerationResponse).not.toHaveBeenCalled()
})

it('should reject when association cannot find the generation run', async () => {
  vi.mocked(retrieveHistoryResponse).mockResolvedValue(FAILED_RESPONSE)
  vi.mocked(findGenerationRun).mockResolvedValue(undefined)
  vi.mocked(associateGenerationResponse).mockResolvedValue(undefined)

  await expect(
    handleOpenAiResponseEvent({
      data: {id: 'resp-1'},
      id: 'event-1',
      type: 'response.failed',
    }),
  ).rejects.toThrow('Generation run not found for response: resp-1')
})

it('should reject response metadata for a different run', async () => {
  vi.mocked(retrieveHistoryResponse).mockResolvedValue({
    ...FAILED_RESPONSE,
    metadata: {...FAILED_RESPONSE.metadata, generation_run_id: 'run-2'},
  })
  vi.mocked(findGenerationRun).mockResolvedValue(RUN)

  await expect(
    handleOpenAiResponseEvent({
      data: {id: 'resp-1'},
      id: 'event-1',
      type: 'response.failed',
    }),
  ).rejects.toThrow('does not match the generation run')
})

it('should reject a completed response using an unsupported source policy', async () => {
  mockCompletedResponse(COMPLETED_RESPONSE, {...RUN, sourcePolicyVersion: 'history-sources-v0'})

  await handleOpenAiResponseEvent({
    data: {id: 'resp-1'},
    id: 'event-1',
    type: 'response.completed',
  })

  expect(rejectHistoryResponse).toHaveBeenCalledWith(
    'event-1',
    'resp-1',
    'Unsupported source policy version',
  )
  expect(validateHistoryOutput).not.toHaveBeenCalled()
})

it('should validate, publish, and invalidate a completed response', async () => {
  mockCompletedResponse()

  await handleOpenAiResponseEvent({
    data: {id: 'resp-1'},
    id: 'event-1',
    type: 'response.completed',
  })

  expect(validateHistoryOutput).toHaveBeenCalledWith({
    outputText: COMPLETED_RESPONSE.outputText,
    policy: HISTORY_SOURCE_POLICY,
    requiredTitles: undefined,
    searchSourceUrls: COMPLETED_RESPONSE.searchSourceUrls,
    targetDay: 16,
    targetMonth: 8,
  })
  expect(publishHistoryResponse).toHaveBeenCalledWith({
    eventId: 'event-1',
    generation: GENERATION,
    model: COMPLETED_RESPONSE.model,
    replaceDate: true,
    responseId: 'resp-1',
    searchSourceUrls: COMPLETED_RESPONSE.searchSourceUrls,
  })
  expect(invalidateByTag).toHaveBeenCalledWith('feed:today-in-history')
})

it('should publish selected required titles without replacing the date', async () => {
  const requiredTitles = ['One', 'Two', 'Three']
  const response = {
    ...COMPLETED_RESPONSE,
    metadata: {
      ...COMPLETED_RESPONSE.metadata,
      required_titles: JSON.stringify(requiredTitles),
    },
  }
  mockCompletedResponse(response)

  await handleOpenAiResponseEvent({
    data: {id: 'resp-1'},
    id: 'event-1',
    type: 'response.completed',
  })

  expect(validateHistoryOutput).toHaveBeenCalledWith(expect.objectContaining({requiredTitles}))
  expect(publishHistoryResponse).toHaveBeenCalledWith(expect.objectContaining({replaceDate: false}))
})

it('should reject a response whose retrieved status is not completed', async () => {
  mockCompletedResponse({...COMPLETED_RESPONSE, status: 'incomplete'})

  await handleOpenAiResponseEvent({
    data: {id: 'resp-1'},
    id: 'event-1',
    type: 'response.completed',
  })

  expect(rejectHistoryResponse).toHaveBeenCalledWith(
    'event-1',
    'resp-1',
    'OpenAI response is not complete: incomplete',
  )
})

it.each([
  ['an invalid month', '2026-invalid-16'],
  ['an invalid day', '2026-08-invalid'],
] as const)('should reject a generation run with %s', async (_name, targetDate) => {
  mockCompletedResponse(COMPLETED_RESPONSE, {...RUN, targetDate})

  await handleOpenAiResponseEvent({
    data: {id: 'resp-1'},
    id: 'event-1',
    type: 'response.completed',
  })

  expect(rejectHistoryResponse).toHaveBeenCalledWith(
    'event-1',
    'resp-1',
    'Generation run has an invalid target date',
  )
})

it.each([
  ['invalid JSON', 'not-json'],
  ['an invalid title list', JSON.stringify([])],
] as const)('should reject required titles containing %s', async (_name, requiredTitles) => {
  mockCompletedResponse({
    ...COMPLETED_RESPONSE,
    metadata: {...COMPLETED_RESPONSE.metadata, required_titles: requiredTitles},
  })

  await handleOpenAiResponseEvent({
    data: {id: 'resp-1'},
    id: 'event-1',
    type: 'response.completed',
  })

  expect(rejectHistoryResponse).toHaveBeenCalledOnce()
  expect(publishHistoryResponse).not.toHaveBeenCalled()
})

it('should truncate a validation TypeError before rejecting the response', async () => {
  mockCompletedResponse()
  vi.mocked(validateHistoryOutput).mockImplementation(() => {
    throw new TypeError('x'.repeat(2100))
  })

  await handleOpenAiResponseEvent({
    data: {id: 'resp-1'},
    id: 'event-1',
    type: 'response.completed',
  })

  expect(vi.mocked(rejectHistoryResponse).mock.calls[0]?.[2]).toHaveLength(2000)
})

it('should rethrow an unexpected validation error', async () => {
  mockCompletedResponse()
  vi.mocked(validateHistoryOutput).mockImplementation(() => {
    throw new Error('validator crashed')
  })

  await expect(
    handleOpenAiResponseEvent({
      data: {id: 'resp-1'},
      id: 'event-1',
      type: 'response.completed',
    }),
  ).rejects.toThrow('validator crashed')
  expect(rejectHistoryResponse).not.toHaveBeenCalled()
})

it.each([
  ['publishing', publishHistoryResponse],
  ['cache invalidation', invalidateByTag],
] as const)('should propagate an unexpected %s failure', async (_name, operation) => {
  mockCompletedResponse()
  vi.mocked(operation).mockRejectedValue(new Error('database or cache failed'))

  await expect(
    handleOpenAiResponseEvent({
      data: {id: 'resp-1'},
      id: 'event-1',
      type: 'response.completed',
    }),
  ).rejects.toThrow('database or cache failed')
})

it('should propagate a rejection write failure', async () => {
  mockCompletedResponse({...COMPLETED_RESPONSE, status: 'failed'})
  vi.mocked(rejectHistoryResponse).mockRejectedValue(new Error('rejection write failed'))

  await expect(
    handleOpenAiResponseEvent({
      data: {id: 'resp-1'},
      id: 'event-1',
      type: 'response.completed',
    }),
  ).rejects.toThrow('rejection write failed')
})

it('should propagate a terminal failure write error', async () => {
  vi.mocked(retrieveHistoryResponse).mockResolvedValue(FAILED_RESPONSE)
  vi.mocked(findGenerationRun).mockResolvedValue(RUN)
  vi.mocked(failHistoryResponse).mockRejectedValue(new Error('failure write failed'))

  await expect(
    handleOpenAiResponseEvent({
      data: {id: 'resp-1'},
      id: 'event-1',
      type: 'response.failed',
    }),
  ).rejects.toThrow('failure write failed')
})

it.each([
  ['response retrieval', retrieveHistoryResponse],
  ['generation lookup', findGenerationRun],
] as const)('should propagate a %s error', async (_name, operation) => {
  vi.mocked(retrieveHistoryResponse).mockResolvedValue(FAILED_RESPONSE)
  vi.mocked(findGenerationRun).mockResolvedValue(RUN)
  vi.mocked(operation).mockRejectedValue(new Error('read failed'))

  await expect(
    handleOpenAiResponseEvent({
      data: {id: 'resp-1'},
      id: 'event-1',
      type: 'response.failed',
    }),
  ).rejects.toThrow('read failed')
})
