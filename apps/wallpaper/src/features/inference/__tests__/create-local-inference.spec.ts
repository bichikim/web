import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {convertFileSrc, invoke, isTauri} from '@tauri-apps/api/core'
import {createLocalInference} from '../create-local-inference'
import type {InferenceRequest} from '../types'

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn(),
  invoke: vi.fn(),
  isTauri: vi.fn(),
}))
beforeEach(() => vi.mocked(isTauri).mockReturnValue(false))

class FakeWorker extends EventTarget {
  static instances: FakeWorker[] = []
  readonly postMessage = vi.fn<(request: InferenceRequest) => void>()
  readonly terminate = vi.fn()
  constructor() {
    super()
    FakeWorker.instances.push(this)
  }
  reply(id: number, type: 'status' | 'text' | 'error', text: string) {
    this.dispatchEvent(new MessageEvent('message', {data: {id, text, type}}))
  }
}
afterEach(() => {
  vi.unstubAllGlobals()
  FakeWorker.instances = []
  vi.resetAllMocks()
})

it('should prepare the native shared cache and send its file URL to the worker', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.stubGlobal('navigator', {gpu: {requestAdapter: vi.fn().mockResolvedValue({})}})
  vi.stubGlobal('Worker', FakeWorker)
  vi.mocked(invoke).mockResolvedValue('/cache/conversation-models/revision')
  vi.mocked(convertFileSrc).mockImplementation((path) => `asset://localhost${path}`)
  const model = createLocalInference()
  const pending = model.run({messages: [], type: 'chat'}, new AbortController().signal)
  const worker = FakeWorker.instances[0]
  await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalled(), {interval: 1})
  expect(invoke).toHaveBeenCalledExactlyOnceWith('prepare_conversation_model')
  expect(worker.postMessage.mock.calls[0][0].modelPath).toBe(
    'asset://localhost/cache/conversation-models/revision/',
  )
  worker.reply(1, 'text', '안녕')
  await expect(pending).resolves.toBe('안녕')
  model.dispose()
})
it('should discard native preparation completed after cancellation', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.stubGlobal('navigator', {gpu: {requestAdapter: vi.fn().mockResolvedValue({})}})
  vi.stubGlobal('Worker', FakeWorker)
  const prepared = Promise.withResolvers<string>()
  vi.mocked(invoke).mockReturnValue(prepared.promise)
  const model = createLocalInference()
  const controller = new AbortController()
  const pending = model.run({messages: [], type: 'chat'}, controller.signal)
  await vi.waitFor(() => expect(invoke).toHaveBeenCalled(), {interval: 1})
  controller.abort()
  await expect(pending).rejects.toMatchObject({name: 'AbortError'})
  prepared.resolve('/cache/model')
  await prepared.promise
  expect(FakeWorker.instances[0].postMessage).not.toHaveBeenCalled()
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  model.dispose()
})

it('should avoid native downloads when WebGPU is unavailable', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.stubGlobal('navigator', {gpu: {requestAdapter: vi.fn().mockResolvedValue(null)}})
  vi.stubGlobal('Worker', FakeWorker)
  const model = createLocalInference()
  await expect(
    model.run({messages: [], type: 'chat'}, new AbortController().signal),
  ).rejects.toThrow('WebGPU')
  expect(invoke).not.toHaveBeenCalled()
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  model.dispose()
})

it('should release failed native preparation and allow retrying with a fresh worker', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.stubGlobal('navigator', {gpu: {requestAdapter: vi.fn().mockResolvedValue({})}})
  vi.stubGlobal('Worker', FakeWorker)
  vi.mocked(invoke).mockRejectedValueOnce(new Error('offline')).mockResolvedValue('/cache/model')
  vi.mocked(convertFileSrc).mockImplementation((path) => `asset://localhost${path}`)
  const model = createLocalInference()
  await expect(
    model.run({messages: [], type: 'chat'}, new AbortController().signal),
  ).rejects.toThrow('offline')
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  const retry = model.run({messages: [], type: 'chat'}, new AbortController().signal)
  const worker = FakeWorker.instances[1]
  await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalled(), {interval: 1})
  worker.reply(2, 'text', '다시')
  await expect(retry).resolves.toBe('다시')
  model.dispose()
})

it('should reuse its worker and route status and answers only to the matching request', async () => {
  vi.stubGlobal('Worker', FakeWorker)
  const model = createLocalInference()
  const status = vi.fn()
  const pending = model.run({messages: [], type: 'chat'}, new AbortController().signal, status)
  const worker = FakeWorker.instances[0]
  const id = worker.postMessage.mock.calls[0][0].id
  worker.reply(id + 1, 'text', 'stale')
  worker.reply(id, 'status', '준비 중')
  worker.reply(id, 'text', '안녕')
  await expect(pending).resolves.toBe('안녕')
  expect(status).toHaveBeenCalledExactlyOnceWith('준비 중')
  const next = model.run({messages: [], type: 'chat'}, new AbortController().signal)
  worker.reply(id + 1, 'text', '다음')
  await expect(next).resolves.toBe('다음')
  expect(FakeWorker.instances).toHaveLength(1)
  model.dispose()
  expect(worker.terminate).toHaveBeenCalledOnce()
})

it('should terminate cancelled computation and allow a new worker for a retry', async () => {
  vi.stubGlobal('Worker', FakeWorker)
  const model = createLocalInference()
  const controller = new AbortController()
  const pending = model.run({messages: [], type: 'chat'}, controller.signal)
  controller.abort()
  await expect(pending).rejects.toMatchObject({name: 'AbortError'})
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  const next = model.run({messages: [], type: 'chat'}, new AbortController().signal)
  const worker = FakeWorker.instances[1]
  worker.reply(worker.postMessage.mock.calls[0][0].id, 'text', '다시')
  await expect(next).resolves.toBe('다시')
  model.dispose()
})

it('should reject overlapping work and dispose pending work without accepting later requests', async () => {
  vi.stubGlobal('Worker', FakeWorker)
  const model = createLocalInference()
  const signal = new AbortController().signal
  const pending = model.run({messages: [], type: 'chat'}, signal)
  await expect(model.run({messages: [], type: 'chat'}, signal)).rejects.toThrow()
  model.dispose()
  await expect(pending).rejects.toMatchObject({name: 'AbortError'})
  await expect(model.run({messages: [], type: 'chat'}, signal)).rejects.toThrow()
})

it('should surface model failures and release its worker', async () => {
  vi.stubGlobal('Worker', FakeWorker)
  const model = createLocalInference()
  const pending = model.run({messages: [], type: 'chat'}, new AbortController().signal)
  const worker = FakeWorker.instances[0]
  worker.reply(worker.postMessage.mock.calls[0][0].id, 'error', '다운로드 오류')
  await expect(pending).rejects.toThrow('다운로드 오류')
  expect(worker.terminate).toHaveBeenCalledOnce()
  model.dispose()
})
