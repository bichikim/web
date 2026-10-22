/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {successResult} from 'src/features/result'
import {loadExclusiveWorker} from 'src/features/text-generation/__tests__/fixtures/exclusive-worker'
import {drawTarotCards} from '../cards'
import type {TarotWorkerRequest, TarotWorkerResponse} from '../messages'

const mocks = vi.hoisted(() => ({generate: vi.fn(), prepare: vi.fn()}))
vi.mock('src/features/text-generation/execution', () => ({
  createTextGenerationExecutor: () => ({generate: mocks.generate, prepare: mocks.prepare}),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

it('should reject only the overlapping request and complete the active request', async () => {
  vi.resetModules()
  const generation = Promise.withResolvers<ReturnType<typeof successResult<string>>>()
  const started = Promise.withResolvers<void>()
  mocks.prepare.mockResolvedValue(successResult(undefined))
  mocks.generate.mockImplementation(() => {
    started.resolve()
    return generation.promise
  })
  const worker = await loadExclusiveWorker<TarotWorkerRequest, TarotWorkerResponse>(
    () => import('../worker'),
  )
  const first: TarotWorkerRequest = {
    cards: drawTarotCards({count: 1, random: () => 0.5}),
    locale: 'ko',
    modelId: 'gemma-4-e2b',
    question: 'first',
    requestId: 'first',
    type: 'generate',
  }
  const second: TarotWorkerRequest = {...first, question: 'second', requestId: 'second'}
  worker.dispatch(first)
  await started.promise
  const skipped = worker.nextResponse('skipped')
  worker.dispatch(second)
  expect(await skipped).toEqual({reason: 'busy', request: second, type: 'skipped'})
  expect(mocks.generate).toHaveBeenCalledOnce()
  expect(
    worker.postMessage.mock.calls.filter(([response]) => response.type === 'complete'),
  ).toHaveLength(0)
  const complete = worker.nextResponse('complete')
  generation.resolve(successResult('first answer'))
  expect(await complete).toMatchObject({text: 'first answer', type: 'complete'})
  expect(
    worker.postMessage.mock.calls.filter(([response]) => response.type === 'complete'),
  ).toHaveLength(1)
  expect(
    worker.postMessage.mock.calls.filter(([response]) => response.type === 'error'),
  ).toHaveLength(0)
})
