/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {successResult} from 'src/features/result'
import {loadExclusiveWorker} from 'src/features/text-generation/__tests__/fixtures/exclusive-worker'
import type {SajuGenerateRequest, SajuGenerationResponse} from '../generation-messages'

const mocks = vi.hoisted(() => ({generate: vi.fn(), prepare: vi.fn()}))
vi.mock('src/features/text-generation/execution', () => ({
  createTextGenerationExecutor: () => ({generate: mocks.generate, prepare: mocks.prepare}),
}))
vi.mock('src/features/saju/generate-answer', () => ({
  generateSajuAnswer: (
    _request: unknown,
    generate: (messages: readonly unknown[]) => Promise<string>,
  ) => generate([]).then((text) => ({text, type: 'complete'})),
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
  const worker = await loadExclusiveWorker<SajuGenerateRequest, SajuGenerationResponse>(
    () => import('../worker'),
  )
  const first: SajuGenerateRequest = {
    messages: [],
    modelId: 'gemma-4-e2b',
    requestId: 'first',
    type: 'generate',
  }
  const second: SajuGenerateRequest = {...first, requestId: 'second'}
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
