/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createFaceTracker} from '../create-face-tracker'
vi.mock('@mediapipe/tasks-vision', () => ({FilesetResolver: {isSimdSupported: async () => false}}))
afterEach(() => vi.unstubAllGlobals())
const setup = async () => {
  const initialized = Promise.withResolvers<void>()
  const worker = Object.assign(new EventTarget(), {
    postMessage: vi.fn((message: {type: string}) => {
      if (message.type === 'initialize') {
        initialized.resolve()
      }
    }),
    terminate: vi.fn(),
  })
  vi.stubGlobal(
    'Worker',
    vi.fn(function createWorker() {
      return worker
    }),
  )
  const callbacks = {onError: vi.fn(), onFrame: vi.fn(), onReady: vi.fn()}
  const tracker = createFaceTracker(callbacks)
  await initialized.promise
  return {callbacks, tracker, worker}
}
test('should close a captured bitmap when sending the frame fails', async () => {
  const {callbacks, tracker, worker} = await setup()
  worker.dispatchEvent(new MessageEvent('message', {data: {type: 'ready'}}))
  const image = {close: vi.fn()}
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => image),
  )
  worker.postMessage.mockImplementationOnce(() => {
    throw new Error('transfer failed')
  })
  await tracker.submit({readyState: 2} as HTMLVideoElement, 1)
  expect(image.close).toHaveBeenCalledOnce()
  expect(callbacks.onError).toHaveBeenCalledWith('transfer failed')
  tracker.dispose()
})
test('should not dispatch queued worker callbacks after disposal', async () => {
  const {callbacks, tracker, worker} = await setup()
  tracker.dispose()
  worker.dispatchEvent(new MessageEvent('message', {data: {type: 'ready'}}))
  worker.dispatchEvent(
    new MessageEvent('message', {data: {frame: {timestamp: 1, values: null}, type: 'frame'}}),
  )
  worker.dispatchEvent(new ErrorEvent('error', {message: 'late error'}))
  expect(callbacks.onReady).not.toHaveBeenCalled()
  expect(callbacks.onFrame).not.toHaveBeenCalled()
  expect(callbacks.onError).not.toHaveBeenCalled()
})
