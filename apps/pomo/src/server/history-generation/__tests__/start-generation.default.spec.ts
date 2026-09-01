import {beforeEach, expect, it, vi} from 'vitest'

const generationMocks = vi.hoisted(() => ({
  markFailed: vi.fn(),
  markSubmitted: vi.fn(),
  markUnknown: vi.fn(),
  prepare: vi.fn(),
  submit: vi.fn(),
}))

vi.mock('src/env', () => ({env: {}}))
vi.mock('../generation-repository', () => ({
  markGenerationFailed: generationMocks.markFailed,
  markGenerationSubmissionUnknown: generationMocks.markUnknown,
  markGenerationSubmitted: generationMocks.markSubmitted,
  prepareGenerationRun: generationMocks.prepare,
}))

vi.mock('../openai-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../openai-client')>()
  return {...original, submitHistoryResponse: generationMocks.submit}
})

beforeEach(() => {
  vi.clearAllMocks()
})

it('should use the production dependencies by default', async () => {
  generationMocks.prepare.mockResolvedValue({
    created: false,
    run: {
      id: 'run-default',
      openAiResponseId: 'response-default',
      targetDate: '2026-08-27',
    },
  })
  const {startHistoryGeneration} = await import('../start-generation')

  await expect(startHistoryGeneration()).resolves.toEqual({
    responseId: 'response-default',
    runId: 'run-default',
    status: 'existing',
    targetDate: '2026-08-27',
  })
  expect(generationMocks.prepare).toHaveBeenCalledOnce()
})
