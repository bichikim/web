/** @vitest-environment node */
import flushPromises from 'flush-promises'
import {afterAll, beforeAll, beforeEach, expect, it, vi} from 'vitest'

import {createModelStorage, createResumableModelFetch} from '../../model-storage'
import {downloadTextModel} from '../../text-generation/download-text-model'
import type {PrepareTextModelRequest} from '../../text-generation/messages'
import type {TextModelDownloadResponse} from '../text-client'

vi.mock('../../text-generation/download-text-model', () => ({downloadTextModel: vi.fn()}))
vi.mock('../../model-storage', () => ({
  createModelStorage: vi.fn(),
  createResumableModelFetch: vi.fn(),
  reportModelStorageError: vi.fn(),
}))
vi.mock('../../http-client', () => ({httpFetch: vi.fn()}))

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

let worker: Awaited<ReturnType<typeof loadWorker>>

beforeAll(async () => {
  worker = await loadWorker()
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(downloadTextModel).mockResolvedValue(undefined)
  vi.mocked(createModelStorage).mockReturnValue({delete: vi.fn(), get: vi.fn(), set: vi.fn()})
  vi.mocked(createResumableModelFetch).mockReturnValue({
    deletePartial: vi.fn(),
    fetch: vi.fn(),
  })
})

afterAll(() => vi.unstubAllGlobals())

it('should retry downloading after a synchronous failure', async () => {
  vi.mocked(downloadTextModel).mockImplementationOnce(() => {
    throw new Error('download creation failed')
  })

  worker.dispatch('qwen-4b')
  await flushPromises()
  expect(worker.postMessage).toHaveBeenLastCalledWith({
    message: 'download creation failed',
    restartRequired: false,
    type: 'error',
  })

  worker.dispatch('qwen-4b')
  await flushPromises()
  expect(downloadTextModel).toHaveBeenCalledTimes(2)
  expect(worker.postMessage).toHaveBeenLastCalledWith({type: 'ready'})
})

it('should retry downloading after a rejected download', async () => {
  vi.mocked(downloadTextModel).mockRejectedValueOnce(new Error('download failed'))

  worker.dispatch('qwen-4b')
  await flushPromises()
  expect(worker.postMessage).toHaveBeenLastCalledWith({
    message: 'download failed',
    restartRequired: false,
    type: 'error',
  })

  worker.dispatch('qwen-4b')
  await flushPromises()
  expect(downloadTextModel).toHaveBeenCalledTimes(2)
  expect(vi.mocked(downloadTextModel).mock.calls.map(([options]) => options.modelId)).toEqual([
    'qwen-4b',
    'qwen-4b',
  ])
  expect(worker.postMessage).toHaveBeenLastCalledWith({type: 'ready'})
})

it('should report both concurrent download completions for the same model', async () => {
  const first = Promise.withResolvers<void>()
  const second = Promise.withResolvers<void>()
  vi.mocked(downloadTextModel)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)

  worker.dispatch('qwen-4b')
  worker.dispatch('qwen-4b')
  expect(downloadTextModel).toHaveBeenCalledTimes(2)
  expect(downloadTextModel).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({modelId: 'qwen-4b'}),
  )
  expect(downloadTextModel).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({modelId: 'qwen-4b'}),
  )
  expect(worker.postMessage).not.toHaveBeenCalled()

  second.resolve()
  await flushPromises()
  expect(worker.postMessage).toHaveBeenCalledOnce()
  first.resolve()
  await flushPromises()
  expect(worker.postMessage.mock.calls).toEqual([[{type: 'ready'}], [{type: 'ready'}]])
})

it('should keep different model downloads independent when requested concurrently', async () => {
  const pending = Promise.withResolvers<void>()
  vi.mocked(downloadTextModel).mockReturnValueOnce(pending.promise)

  worker.dispatch('qwen-4b')
  worker.dispatch('gemma-4-e2b')
  await flushPromises()
  expect(downloadTextModel).toHaveBeenCalledTimes(2)
  expect(worker.postMessage).toHaveBeenCalledOnce()

  pending.resolve()
  await flushPromises()
  worker.dispatch('qwen-4b')
  worker.dispatch('gemma-4-e2b')
  await flushPromises()
  expect(vi.mocked(downloadTextModel).mock.calls.map(([options]) => options.modelId)).toEqual([
    'qwen-4b',
    'gemma-4-e2b',
    'qwen-4b',
    'gemma-4-e2b',
  ])
  expect(worker.postMessage.mock.calls).toEqual([
    [{type: 'ready'}],
    [{type: 'ready'}],
    [{type: 'ready'}],
    [{type: 'ready'}],
  ])
})
