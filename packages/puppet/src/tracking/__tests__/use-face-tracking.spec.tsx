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
      getUserMedia: async () => ({getTracks: () => [{addEventListener: vi.fn(), stop}]}),
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
