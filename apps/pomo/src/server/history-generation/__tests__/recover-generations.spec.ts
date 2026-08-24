import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  handleOpenAiResponseEvent: vi.fn(),
  listRecoverableGenerationRuns: vi.fn(),
  retrieveHistoryResponse: vi.fn(),
  startHistoryGeneration: vi.fn(),
}))

vi.mock('../generation-repository', () => ({
  listRecoverableGenerationRuns: mocks.listRecoverableGenerationRuns,
}))
vi.mock('../handle-openai-webhook', () => ({
  handleOpenAiResponseEvent: mocks.handleOpenAiResponseEvent,
}))
vi.mock('../response-result', () => ({retrieveHistoryResponse: mocks.retrieveHistoryResponse}))
vi.mock('../start-generation', () => ({startHistoryGeneration: mocks.startHistoryGeneration}))

import {recoverHistoryGenerations} from '../recover-generations'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.handleOpenAiResponseEvent.mockResolvedValue(undefined)
  mocks.startHistoryGeneration.mockResolvedValue({
    responseId: null,
    runId: 'retry-run',
    status: 'existing',
    targetDate: '2026-08-25',
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should continue recovery and generation retry when one response retrieval fails', async () => {
  const retrievalError = new Error('Response not found')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mocks.listRecoverableGenerationRuns.mockResolvedValue([
    {responseId: 'resp-unreadable'},
    {responseId: 'resp-completed'},
  ])
  mocks.retrieveHistoryResponse
    .mockRejectedValueOnce(retrievalError)
    .mockResolvedValueOnce({status: 'completed'})

  await expect(recoverHistoryGenerations()).resolves.toEqual({
    checked: 2,
    failed: 1,
    terminal: 1,
  })
  expect(mocks.retrieveHistoryResponse).toHaveBeenCalledTimes(2)
  expect(mocks.handleOpenAiResponseEvent).toHaveBeenCalledWith({
    data: {id: 'resp-completed'},
    id: 'recovery:resp-completed',
    type: 'response.completed',
  })
  expect(mocks.startHistoryGeneration).toHaveBeenCalledTimes(1)
  expect(console.error).toHaveBeenCalledWith(
    'Failed to recover OpenAI response',
    {responseId: 'resp-unreadable'},
    retrievalError,
  )
})
