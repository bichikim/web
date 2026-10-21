/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createCameraSession} from '../create-camera-session'

const setup = () => {
  const track = new EventTarget()
  const stopTrack = vi.fn()
  Object.assign(track, {stop: stopTrack})
  const stream = {getTracks: () => [track], getVideoTracks: () => [track]}
  const worker = {
    onerror: null as ((cause: unknown) => void) | null,
    onmessage: null as ((event: MessageEvent) => void) | null,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  }
  vi.stubGlobal(
    'Worker',
    vi.fn(function setup() {
      return worker
    }),
  )
  const acquire = vi.fn().mockResolvedValue(stream)
  vi.stubGlobal('navigator', {mediaDevices: {getUserMedia: acquire}})
  const video = document.createElement('video')
  vi.spyOn(video, 'play').mockResolvedValue(undefined)
  vi.spyOn(video, 'pause').mockImplementation(() => undefined)
  Object.assign(video, {
    cancelVideoFrameCallback: vi.fn(),
    requestVideoFrameCallback: vi.fn().mockReturnValue(1),
  })
  return {acquire, stopTrack, stream, track, video, worker}
}
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('should stop the stream and inference worker when face following is disabled', async () => {
  const fixture = setup()
  const onPoint = vi.fn()
  const session = createCameraSession({onError: vi.fn(), onPoint, video: fixture.video})
  await Promise.resolve()
  await Promise.resolve()
  expect(fixture.video.srcObject).toBe(fixture.stream)
  expect(fixture.acquire).toHaveBeenCalledWith(expect.objectContaining({audio: false}))
  session.stop()
  session.stop()
  expect(fixture.stopTrack).toHaveBeenCalledOnce()
  expect(fixture.worker.terminate).toHaveBeenCalledOnce()
  expect(fixture.video.srcObject).toBeNull()
  expect(onPoint).toHaveBeenCalledExactlyOnceWith({detected: false, x: 0, y: 0})
})

test('should immediately release camera access granted after cancellation', async () => {
  const fixture = setup()
  const permission = Promise.withResolvers<unknown>()
  fixture.acquire.mockReturnValue(permission.promise)
  const session = createCameraSession({onError: vi.fn(), onPoint: vi.fn(), video: fixture.video})
  session.stop()
  permission.resolve(fixture.stream)
  await permission.promise
  await Promise.resolve()
  expect(fixture.stopTrack).toHaveBeenCalledOnce()
  expect(fixture.video.play).not.toHaveBeenCalled()
})

test('should release the worker and surface a denied camera permission', async () => {
  const fixture = setup()
  const failure = new DOMException('Permission denied', 'NotAllowedError')
  fixture.acquire.mockRejectedValue(failure)
  const onError = vi.fn()
  createCameraSession({onError, onPoint: vi.fn(), video: fixture.video})
  await Promise.resolve()
  await Promise.resolve()
  expect(onError).toHaveBeenCalledExactlyOnceWith(failure)
  expect(fixture.worker.terminate).toHaveBeenCalledOnce()
})

test('should release an active camera when its inference worker fails', async () => {
  const fixture = setup()
  const onError = vi.fn()
  createCameraSession({onError, onPoint: vi.fn(), video: fixture.video})
  await Promise.resolve()
  await Promise.resolve()
  fixture.worker.onmessage?.(
    new MessageEvent('message', {data: {message: 'Model failed', type: 'error'}}),
  )
  expect(fixture.stopTrack).toHaveBeenCalledOnce()
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({message: 'Model failed'}))
})
