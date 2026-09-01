import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  expireGenerationSubmission: vi.fn(),
  handleOpenAiResponseEvent: vi.fn(),
  listRecoverableGenerationRuns: vi.fn(),
  retrieveHistoryResponse: vi.fn(),
  startHistoryGeneration: vi.fn(),
}))

vi.mock('../generation-recovery-repository', () => ({
  expireGenerationSubmission: mocks.expireGenerationSubmission,
  listRecoverableGenerationRuns: mocks.listRecoverableGenerationRuns,
}))
vi.mock('../handle-openai-webhook', () => ({
  handleOpenAiResponseEvent: mocks.handleOpenAiResponseEvent,
}))
vi.mock('../response-result', () => ({retrieveHistoryResponse: mocks.retrieveHistoryResponse}))
vi.mock('../start-generation', () => ({startHistoryGeneration: mocks.startHistoryGeneration}))

import {recoverHistoryGenerations} from '../recover-generations'

const NOW = new Date('2026-08-25T00:30:00.000Z')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.handleOpenAiResponseEvent.mockResolvedValue(undefined)
  mocks.expireGenerationSubmission.mockResolvedValue(true)
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
    {kind: 'response', responseId: 'resp-unreadable'},
    {kind: 'response', responseId: 'resp-completed'},
  ])
  mocks.retrieveHistoryResponse
    .mockRejectedValueOnce(retrievalError)
    .mockResolvedValueOnce({status: 'completed'})

  await expect(recoverHistoryGenerations(NOW)).resolves.toEqual({
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

it.each([
  ['cancelled', 'response.cancelled'],
  ['completed', 'response.completed'],
  ['failed', 'response.failed'],
  ['incomplete', 'response.incomplete'],
] as const)('should replay terminal %s responses', async (status, eventType) => {
  mocks.listRecoverableGenerationRuns.mockResolvedValue([
    {kind: 'response', responseId: `resp-${status}`},
  ])
  mocks.retrieveHistoryResponse.mockResolvedValue({status})

  await expect(recoverHistoryGenerations(NOW)).resolves.toEqual({
    checked: 1,
    failed: 0,
    terminal: 1,
  })

  expect(mocks.handleOpenAiResponseEvent).toHaveBeenCalledWith({
    data: {id: `resp-${status}`},
    id: `recovery:resp-${status}`,
    type: eventType,
  })
})

it.each(['in_progress', 'queued', undefined] as const)(
  'should leave %s responses pending',
  async (status) => {
    mocks.listRecoverableGenerationRuns.mockResolvedValue([
      {kind: 'response', responseId: 'resp-pending'},
    ])
    mocks.retrieveHistoryResponse.mockResolvedValue({status})

    await expect(recoverHistoryGenerations(NOW)).resolves.toEqual({
      checked: 1,
      failed: 0,
      terminal: 0,
    })

    expect(mocks.handleOpenAiResponseEvent).not.toHaveBeenCalled()
  },
)

it('should isolate webhook and unknown status failures', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mocks.listRecoverableGenerationRuns.mockResolvedValue([
    {kind: 'response', responseId: 'resp-webhook'},
    {kind: 'response', responseId: 'resp-unknown'},
  ])
  mocks.retrieveHistoryResponse
    .mockResolvedValueOnce({status: 'completed'})
    .mockResolvedValueOnce({status: 'future-status'})
  mocks.handleOpenAiResponseEvent.mockRejectedValueOnce(new Error('webhook failed'))

  await expect(recoverHistoryGenerations(NOW)).resolves.toEqual({
    checked: 2,
    failed: 2,
    terminal: 0,
  })

  expect(console.error).toHaveBeenCalledTimes(2)
  expect(mocks.startHistoryGeneration).toHaveBeenCalledOnce()
})

it('should still retry generation when there are no stale runs', async () => {
  mocks.listRecoverableGenerationRuns.mockResolvedValue([])

  await expect(recoverHistoryGenerations(NOW)).resolves.toEqual({
    checked: 0,
    failed: 0,
    terminal: 0,
  })

  expect(mocks.startHistoryGeneration).toHaveBeenCalledOnce()
})

it('should expire an ambiguous submission before retrying generation', async () => {
  mocks.listRecoverableGenerationRuns.mockResolvedValue([
    {kind: 'submission_unknown', runId: 'run-unknown'},
  ])

  await expect(recoverHistoryGenerations(NOW)).resolves.toEqual({
    checked: 1,
    failed: 0,
    terminal: 1,
  })

  expect(mocks.expireGenerationSubmission).toHaveBeenCalledWith('run-unknown', {
    preparingBefore: new Date('2026-08-25T00:00:00.000Z'),
    submissionExpiredBefore: NOW,
    submittedBefore: new Date('2026-08-25T00:00:00.000Z'),
  })
  expect(mocks.retrieveHistoryResponse).not.toHaveBeenCalled()
  expect(mocks.startHistoryGeneration).toHaveBeenCalledOnce()
})

it('should isolate an ambiguous submission expiration failure', async () => {
  const expirationError = new Error('Database unavailable')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mocks.listRecoverableGenerationRuns.mockResolvedValue([
    {kind: 'submission_unknown', runId: 'run-unknown'},
  ])
  mocks.expireGenerationSubmission.mockRejectedValue(expirationError)

  await expect(recoverHistoryGenerations(NOW)).resolves.toEqual({
    checked: 1,
    failed: 1,
    terminal: 0,
  })

  expect(console.error).toHaveBeenCalledWith(
    'Failed to expire ambiguous OpenAI submission',
    {runId: 'run-unknown'},
    expirationError,
  )
  expect(mocks.startHistoryGeneration).toHaveBeenCalledOnce()
})
