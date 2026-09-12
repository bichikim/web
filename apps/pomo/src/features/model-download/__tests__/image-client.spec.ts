/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const reportClientError = vi.hoisted(() => vi.fn())

vi.mock('../../client-error-reporter/reporter', () => ({reportClientError}))

import {createImageModelDownloadClient} from '../image-client'

class WorkerErrorEvent extends Event {
  readonly message: string

  constructor(message: string) {
    super('error')
    this.message = message
  }
}

class DownloadWorker extends EventTarget {
  static instances: Array<DownloadWorker> = []
  constructor() {
    super()
    DownloadWorker.instances.push(this)
  }
  emitError(message: string) {
    this.dispatchEvent(new WorkerErrorEvent(message))
  }
  emitMessageError() {
    this.dispatchEvent(new Event('messageerror'))
  }
  postMessage = vi.fn()
  terminate = vi.fn()
}
beforeEach(() => {
  DownloadWorker.instances = []
  vi.stubGlobal('Worker', DownloadWorker)
})
afterEach(() => vi.unstubAllGlobals())

it('should route image preparation, progress, completion and disposal through the shared transport', () => {
  const callbacks = {onError: vi.fn(), onProgress: vi.fn(), onReady: vi.fn()}
  const client = createImageModelDownloadClient({callbacks, modelId: 'ternary'})
  const worker = DownloadWorker.instances[0]!
  client.prepare()
  expect(worker.postMessage).toHaveBeenCalledWith({type: 'prepare-image', variant: 'ternary'})
  worker.dispatchEvent(
    new MessageEvent('message', {data: {label: 'Model', percentage: 42, type: 'progress'}}),
  )
  expect(callbacks.onProgress).toHaveBeenCalledWith(42)
  worker.dispatchEvent(
    new MessageEvent('message', {data: {message: 'Download failed', type: 'error'}}),
  )
  expect(callbacks.onError).toHaveBeenCalledWith('Download failed')
  worker.emitError('Image download failed')
  expect(callbacks.onError).toHaveBeenLastCalledWith('Image download failed')
  expect(reportClientError).toHaveBeenCalledWith(
    {message: 'Worker execution failed', name: 'WorkerError'},
    {feature: 'image-model-download', source: 'worker'},
  )
  worker.emitError('')
  expect(callbacks.onError).toHaveBeenLastCalledWith('이미지 모델을 내려받지 못했어요.')
  worker.emitMessageError()
  expect(callbacks.onError).toHaveBeenLastCalledWith('Worker 응답을 읽지 못했습니다.')
  worker.dispatchEvent(new MessageEvent('message', {data: {type: 'ready'}}))
  expect(callbacks.onReady).toHaveBeenCalledOnce()
  client.dispose()
  expect(worker.terminate).toHaveBeenCalledOnce()
})
