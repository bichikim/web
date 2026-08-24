import {afterEach, expect, it, vi} from 'vitest'
import {invalidateByTag} from '@vercel/functions'

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
