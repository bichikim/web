/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {useFaceTracking} from '../use-face-tracking'

const mocks = vi.hoisted(() => ({createFaceTracker: vi.fn()}))
vi.mock('../create-face-tracker', () => mocks)
afterEach(() => vi.unstubAllGlobals())

test('should release late camera permission results after cancellation', async () => {
  let resolve: (stream: MediaStream) => void = () => undefined
  const stop = vi.fn()
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: () =>
        new Promise<MediaStream>((finish) => {
          resolve = finish
        }),
    },
  })
  const {result} = renderHook(() =>
    useFaceTracking({onFrame: () => undefined, video: () => undefined}),
  )
  const pending = result.start()
  result.stop()
  resolve({getTracks: () => [{stop}]} as unknown as MediaStream)
  await pending
  expect(stop).toHaveBeenCalledOnce()
  expect(result.status()).toBe('stopped')
})
test('should release the worker, frame callback and media stream on unmount', async () => {
  const dispose = vi.fn()
  const stop = vi.fn()
  const video = {
    cancelVideoFrameCallback: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    requestVideoFrameCallback: vi.fn().mockReturnValue(7),
    srcObject: null,
  } as unknown as HTMLVideoElement
  const onFrame = vi.fn()
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: async () => ({
        getTracks: () => [{addEventListener: vi.fn(), removeEventListener: vi.fn(), stop}],
      }),
    },
  })
  mocks.createFaceTracker.mockReturnValue({dispose, submit: vi.fn().mockResolvedValue(undefined)})
  const {result, cleanup} = renderHook(() => useFaceTracking({onFrame, video: () => video}))
  await result.start()
  const options = mocks.createFaceTracker.mock.lastCall![0]
  options.onReady()
  options.onFrame({timestamp: 1, values: {mouthOpen: 0.5}})
  expect(result.status()).toBe('tracking')
  options.onFrame({timestamp: 2, values: null})
  expect(result.status()).toBe('missing')
  cleanup()
  expect(dispose).toHaveBeenCalledOnce()
  expect(stop).toHaveBeenCalledOnce()
  expect(video.cancelVideoFrameCallback).toHaveBeenCalledWith(7)
  expect(video.srcObject).toBeNull()
  expect(onFrame).toHaveBeenLastCalledWith({timestamp: 0, values: null})
})

test('should ignore a previous camera track ending after tracking restarts', async () => {
  const oldTrack = Object.assign(new EventTarget(), {stop: vi.fn()})
  const nextTrack = Object.assign(new EventTarget(), {stop: vi.fn()})
  const streams = [oldTrack, nextTrack].map((track) => ({getTracks: () => [track]}))
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValueOnce(streams[0]).mockResolvedValueOnce(streams[1]),
    },
  })
  const video = {
    cancelVideoFrameCallback: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    requestVideoFrameCallback: vi.fn(),
    srcObject: null,
  } as unknown as HTMLVideoElement
  const dispose = vi.fn()
  mocks.createFaceTracker.mockReturnValue({dispose, submit: vi.fn().mockResolvedValue(undefined)})
  const {result} = renderHook(() => useFaceTracking({onFrame: () => undefined, video: () => video}))
  await result.start()
  await result.start()
  oldTrack.dispatchEvent(new Event('ended'))
  expect(video.srcObject).toBe(streams[1])
  expect(nextTrack.stop).not.toHaveBeenCalled()
  expect(result.status()).toBe('starting')
})

test('should ignore a rejected old frame after tracking restarts', async () => {
  const pending = Promise.withResolvers<void>()
  const submit = vi.fn(() => pending.promise)
  mocks.createFaceTracker.mockReturnValue({dispose: vi.fn(), submit})
  const track = Object.assign(new EventTarget(), {stop: vi.fn()})
  vi.stubGlobal('navigator', {
    mediaDevices: {getUserMedia: async () => ({getTracks: () => [track]})},
  })
  const video = {
    cancelVideoFrameCallback: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    requestVideoFrameCallback: vi.fn(() => 1),
    srcObject: null,
  } as unknown as HTMLVideoElement
  const {result} = renderHook(() => useFaceTracking({onFrame: () => undefined, video: () => video}))
  await result.start()
  mocks.createFaceTracker.mock.lastCall![0].onReady()
  const callback = vi.mocked(video.requestVideoFrameCallback).mock.lastCall![0]
  callback(0, {mediaTime: 1} as VideoFrameCallbackMetadata)
  await result.start()
  pending.reject(new Error('stale frame'))
  await pending.promise.catch(() => undefined)
  expect(result.status()).toBe('starting')
  expect(result.error()).toBeNull()
})
