/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  expireGenerationSubmission: vi.fn(),
  handleOpenAiResponseEvent: vi.fn(),
  listRecoverableGenerationRuns: vi.fn(),
  retrieveHistoryResponse: vi.fn(),
  startHistoryGeneration: vi.fn(),
}))

vi.mock('../../repositories/history-generation-recovery', () => ({
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

it('should count mixed results while excluding pending submissions and responses', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mocks.listRecoverableGenerationRuns.mockResolvedValue([
    {kind: 'submission_unknown', runId: 'expired'},
    {kind: 'submission_unknown', runId: 'pending'},
    {kind: 'response', responseId: 'pending-response'},
    {kind: 'response', responseId: 'unreadable'},
    {kind: 'response', responseId: 'webhook-failed'},
  ])
  mocks.expireGenerationSubmission.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
  mocks.retrieveHistoryResponse
    .mockResolvedValueOnce({status: 'queued'})
    .mockRejectedValueOnce(new Error('retrieval failed'))
    .mockResolvedValueOnce({status: 'completed'})
  mocks.handleOpenAiResponseEvent.mockRejectedValueOnce(new Error('webhook failed'))

  await expect(recoverHistoryGenerations(NOW)).resolves.toEqual({
    checked: 5,
    failed: 2,
    terminal: 1,
  })
  expect(mocks.expireGenerationSubmission).toHaveBeenCalledTimes(2)
  expect(mocks.retrieveHistoryResponse).toHaveBeenCalledTimes(3)
  expect(mocks.startHistoryGeneration).toHaveBeenCalledOnce()
})

it('should wait for every concurrent recovery before starting the next generation', async () => {
  const expiration = Promise.withResolvers<boolean>()
  const retrieval = Promise.withResolvers<{status: 'completed'}>()
  mocks.listRecoverableGenerationRuns.mockResolvedValue([
    {kind: 'submission_unknown', runId: 'pending-expiration'},
    {kind: 'response', responseId: 'pending-retrieval'},
  ])
  mocks.expireGenerationSubmission.mockReturnValueOnce(expiration.promise)
  mocks.retrieveHistoryResponse.mockReturnValueOnce(retrieval.promise)

  const recovery = recoverHistoryGenerations(NOW)
  await Promise.resolve()
  expect(mocks.expireGenerationSubmission).toHaveBeenCalledOnce()
  expect(mocks.retrieveHistoryResponse).toHaveBeenCalledOnce()
  expect(mocks.startHistoryGeneration).not.toHaveBeenCalled()

  expiration.resolve(false)
  await Promise.resolve()
  expect(mocks.startHistoryGeneration).not.toHaveBeenCalled()

  retrieval.resolve({status: 'completed'})
  await expect(recovery).resolves.toEqual({checked: 2, failed: 0, terminal: 1})
  expect(mocks.startHistoryGeneration).toHaveBeenCalledOnce()
})

it('should propagate a run-list failure without starting another generation', async () => {
  const error = new Error('run list unavailable')
  mocks.listRecoverableGenerationRuns.mockRejectedValue(error)

  await expect(recoverHistoryGenerations(NOW)).rejects.toBe(error)
  expect(mocks.retrieveHistoryResponse).not.toHaveBeenCalled()
  expect(mocks.expireGenerationSubmission).not.toHaveBeenCalled()
  expect(mocks.startHistoryGeneration).not.toHaveBeenCalled()
})

it('should propagate the next-generation failure after recovery completes', async () => {
  const error = new Error('generation retry unavailable')
  mocks.listRecoverableGenerationRuns.mockResolvedValue([
    {kind: 'submission_unknown', runId: 'expired'},
  ])
  mocks.startHistoryGeneration.mockRejectedValue(error)

  await expect(recoverHistoryGenerations(NOW)).rejects.toBe(error)
  expect(mocks.expireGenerationSubmission).toHaveBeenCalledOnce()
  expect(mocks.startHistoryGeneration).toHaveBeenCalledOnce()
})
