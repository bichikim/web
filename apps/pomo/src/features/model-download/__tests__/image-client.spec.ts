import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createImageModelDownloadClient} from '../image-client'

class DownloadWorker extends EventTarget {
  static instances: Array<DownloadWorker> = []
  constructor() {
    super()
    DownloadWorker.instances.push(this)
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
  worker.dispatchEvent(new MessageEvent('message', {data: {type: 'ready'}}))
  expect(callbacks.onReady).toHaveBeenCalledOnce()
  client.dispose()
  expect(worker.terminate).toHaveBeenCalledOnce()
})
