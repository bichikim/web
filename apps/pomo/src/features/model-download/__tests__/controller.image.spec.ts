import {expect, it, vi} from 'vitest'
import {
  createModelDownloadController,
  type ModelDownloadCallbacks,
  type ModelDownloadRuntime,
} from '../controller'

const setup = () => {
  const callbacks: Array<ModelDownloadCallbacks> = []
  const clients: Array<{dispose: ReturnType<typeof vi.fn>; prepare: ReturnType<typeof vi.fn>}> = []
  const runtime: ModelDownloadRuntime = {
    createImageClient: vi.fn((options) => {
      callbacks.push(options.callbacks)
      const client = {dispose: vi.fn(), prepare: vi.fn()}
      clients.push(client)
      return client
    }),
    createTextClient: vi.fn(),
    createVoiceClient: vi.fn(),
  }
  return {callbacks, clients, controller: createModelDownloadController(runtime), runtime}
}

it('should inject the image client and share preparation, progress and completion', async () => {
  const test = setup()
  const first = test.controller.startImageModel('ternary')
  expect(test.controller.startImageModel('ternary')).toBe(first)
  expect(test.runtime.createImageClient).toHaveBeenCalledWith(
    expect.objectContaining({modelId: 'ternary'}),
  )
  expect(test.clients[0]!.prepare).toHaveBeenCalledOnce()
  test.callbacks[0]!.onProgress(42)
  expect(test.controller.state()).toMatchObject({
    percentage: 42,
    status: 'loading',
    target: {kind: 'image', modelId: 'ternary'},
  })
  test.callbacks[0]!.onReady()
  await expect(first).resolves.toEqual({status: 'complete'})
  expect(test.clients[0]!.dispose).toHaveBeenCalledOnce()
  expect(test.controller.state()).toEqual({status: 'idle'})
})

it('should cancel a queued image without constructing its client', async () => {
  const test = setup()
  const first = test.controller.startImageModel('ternary')
  const second = test.controller.startImageModel('binary')
  test.controller.cancel({kind: 'image', modelId: 'binary'})
  await expect(second).resolves.toEqual({status: 'cancelled'})
  expect(test.runtime.createImageClient).toHaveBeenCalledOnce()
  test.controller.dispose()
  await expect(first).resolves.toEqual({status: 'cancelled'})
  expect(test.clients[0]!.dispose).toHaveBeenCalledOnce()
})

it('should start the next image after failure and ignore callbacks from the disposed client', async () => {
  const test = setup()
  const first = test.controller.startImageModel('ternary')
  const second = test.controller.startImageModel('binary')
  test.callbacks[0]!.onError('Download failed')
  await expect(first).resolves.toEqual({message: 'Download failed', status: 'error'})
  expect(test.clients[1]!.prepare).toHaveBeenCalledOnce()
  test.callbacks[0]!.onReady()
  test.callbacks[0]!.onProgress(100)
  expect(test.controller.state()).toMatchObject({
    percentage: 0,
    target: {kind: 'image', modelId: 'binary'},
  })
  test.callbacks[1]!.onReady()
  await expect(second).resolves.toEqual({status: 'complete'})
  expect(test.clients.every((client) => client.dispose.mock.calls.length === 1)).toBe(true)
})
