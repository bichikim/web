/** @vitest-environment node */
import flushPromises from 'flush-promises'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  createTextGenerationExecutor,
  type TextGenerationExecutor,
} from '../../text-generation/execution'
import type {PrepareTextModelRequest} from '../../text-generation/messages'
import type {TextModelDownloadResponse} from '../text-client'

vi.mock('../../text-generation/execution', () => ({createTextGenerationExecutor: vi.fn()}))

const createExecutor = (): TextGenerationExecutor => ({
  cancel: vi.fn(),
  countTokens: vi.fn(),
  dispose: vi.fn(),
  generate: vi.fn(),
  getTokenizer: vi.fn(),
  prepare: vi.fn<TextGenerationExecutor['prepare']>(async () => ({ok: true, value: undefined})),
})

const loadWorker = async () => {
  let dispatch: ((event: MessageEvent<PrepareTextModelRequest>) => void) | undefined
  const postMessage = vi.fn<(response: TextModelDownloadResponse) => void>()
  vi.stubGlobal('self', {
    addEventListener: (_type: string, listener: typeof dispatch) => {
      dispatch = listener
    },
    postMessage,
  })
  await import('../text-worker')
  return {
    dispatch: (modelId: PrepareTextModelRequest['modelId']) => {
      if (dispatch === undefined) {
        throw new Error('Worker message listener is missing.')
      }
      dispatch({data: {modelId, type: 'prepare'}} as MessageEvent<PrepareTextModelRequest>)
    },
    postMessage,
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

afterEach(() => vi.unstubAllGlobals())

it('should retry executor creation after a synchronous factory failure', async () => {
  const executor = createExecutor()
  vi.mocked(createTextGenerationExecutor)
    .mockImplementationOnce(() => {
      throw new Error('creation failed')
    })
    .mockReturnValueOnce(executor)
  const worker = await loadWorker()

  worker.dispatch('qwen-4b')
  await flushPromises()
  expect(worker.postMessage).toHaveBeenLastCalledWith({
    message: 'creation failed',
    restartRequired: false,
    type: 'error',
  })

  worker.dispatch('qwen-4b')
  await flushPromises()
  expect(createTextGenerationExecutor).toHaveBeenCalledTimes(2)
  expect(executor.prepare).toHaveBeenCalledOnce()
  expect(worker.postMessage).toHaveBeenLastCalledWith({type: 'ready'})
})

it('should reuse the executor and retry preparation after a failed prepare result', async () => {
  const executor = createExecutor()
  vi.mocked(executor.prepare).mockResolvedValueOnce({
    error: {code: 'execution-failed', detail: 'prepare failed', phase: 'prepare', retryable: true},
    ok: false,
  })
  vi.mocked(createTextGenerationExecutor).mockReturnValue(executor)
  const worker = await loadWorker()

  worker.dispatch('qwen-4b')
  await flushPromises()
  expect(worker.postMessage).toHaveBeenLastCalledWith({
    message: 'prepare failed',
    restartRequired: false,
    type: 'error',
  })

  worker.dispatch('qwen-4b')
  await flushPromises()
  expect(createTextGenerationExecutor).toHaveBeenCalledOnce()
  expect(executor.prepare).toHaveBeenCalledTimes(2)
  expect(worker.postMessage).toHaveBeenLastCalledWith({type: 'ready'})
})

it('should share one executor but run both concurrent preparations for the same model', async () => {
  const first = Promise.withResolvers<Awaited<ReturnType<TextGenerationExecutor['prepare']>>>()
  const second = Promise.withResolvers<Awaited<ReturnType<TextGenerationExecutor['prepare']>>>()
  const executor = createExecutor()
  vi.mocked(executor.prepare).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  vi.mocked(createTextGenerationExecutor).mockReturnValue(executor)
  const worker = await loadWorker()

  worker.dispatch('qwen-4b')
  worker.dispatch('qwen-4b')
  expect(createTextGenerationExecutor).toHaveBeenCalledOnce()
  expect(executor.prepare).toHaveBeenCalledTimes(2)
  expect(executor.prepare).toHaveBeenNthCalledWith(1, {kind: 'device', modelId: 'qwen-4b'})
  expect(executor.prepare).toHaveBeenNthCalledWith(2, {kind: 'device', modelId: 'qwen-4b'})
  expect(worker.postMessage).not.toHaveBeenCalled()

  second.resolve({ok: true, value: undefined})
  await flushPromises()
  expect(worker.postMessage).toHaveBeenCalledOnce()
  first.resolve({ok: true, value: undefined})
  await flushPromises()
  expect(worker.postMessage.mock.calls).toEqual([[{type: 'ready'}], [{type: 'ready'}]])
})

it('should retain distinct executors when different models prepare concurrently', async () => {
  const pending = Promise.withResolvers<Awaited<ReturnType<TextGenerationExecutor['prepare']>>>()
  const first = createExecutor()
  const second = createExecutor()
  vi.mocked(first.prepare).mockReturnValue(pending.promise)
  vi.mocked(createTextGenerationExecutor).mockReturnValueOnce(first).mockReturnValueOnce(second)
  const worker = await loadWorker()

  worker.dispatch('qwen-4b')
  worker.dispatch('gemma-4-e2b')
  await flushPromises()
  expect(createTextGenerationExecutor).toHaveBeenCalledTimes(2)
  expect(first.prepare).toHaveBeenCalledWith({kind: 'device', modelId: 'qwen-4b'})
  expect(second.prepare).toHaveBeenCalledWith({kind: 'device', modelId: 'gemma-4-e2b'})
  expect(worker.postMessage).toHaveBeenCalledOnce()

  pending.resolve({ok: true, value: undefined})
  await flushPromises()
  worker.dispatch('qwen-4b')
  worker.dispatch('gemma-4-e2b')
  await flushPromises()
  expect(createTextGenerationExecutor).toHaveBeenCalledTimes(2)
  expect(first.prepare).toHaveBeenCalledTimes(2)
  expect(second.prepare).toHaveBeenCalledTimes(2)
  expect(worker.postMessage.mock.calls).toEqual([
    [{type: 'ready'}],
    [{type: 'ready'}],
    [{type: 'ready'}],
    [{type: 'ready'}],
  ])
})
