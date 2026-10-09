/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {captureSample, sampleVideo} from '../sample'
import {videoSamplingRuntime} from '../runtime'

vi.mock('../runtime', () => ({
  videoSamplingRuntime: {
    createCanvas: vi.fn(),
    createUrl: vi.fn(),
    createVideo: vi.fn(),
    releaseUrl: vi.fn(),
  },
}))
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

const createDecoder = (duration = 12) => {
  const video = document.createElement('video')
  const canvas = document.createElement('canvas')
  vi.mocked(videoSamplingRuntime.createVideo).mockReturnValue(video)
  vi.mocked(videoSamplingRuntime.createCanvas).mockReturnValue(canvas)
  vi.mocked(videoSamplingRuntime.createUrl).mockReturnValue('blob:sample')
  Object.defineProperties(video, {
    duration: {configurable: true, value: duration},
    videoHeight: {configurable: true, value: 1},
    videoWidth: {configurable: true, value: 2},
  })
  let position = 0
  const seek = vi.fn()
  Object.defineProperty(video, 'currentTime', {
    configurable: true,
    get: () => position,
    set: (time: number) => {
      position = time
      seek(time)
    },
  })
  const load = vi.spyOn(video, 'load').mockImplementation(() => undefined)
  const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)
  const draw = vi.fn()
  vi.spyOn(canvas, 'getContext').mockReturnValue({
    drawImage: draw,
    getImageData: () => ({data: new Uint8ClampedArray(32 * 16 * 4)}),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  return {canvas, draw, load, pause, seek, video}
}

it('should finish each seek and capture before starting the next seek', async () => {
  vi.useFakeTimers()
  const {draw, load, pause, seek, video} = createDecoder()
  const blob = new Blob()
  const pending = sampleVideo(blob, new AbortController().signal)
  expect(videoSamplingRuntime.createUrl).toHaveBeenCalledExactlyOnceWith(blob)
  expect(video.muted).toBe(true)
  expect(video.playsInline).toBe(true)
  expect(video.preload).toBe('auto')
  expect(video.src).toBe('blob:sample')
  expect(seek).not.toHaveBeenCalled()
  video.dispatchEvent(new Event('loadeddata'))
  await Promise.resolve()
  expect(draw).toHaveBeenCalledOnce()
  expect(seek).toHaveBeenCalledTimes(1)
  const times = [11.95 / 3, (11.95 * 2) / 3, 11.95]
  for (const [index, time] of times.entries()) {
    expect(seek.mock.lastCall?.[0]).toBeCloseTo(time, 10)
    expect(draw).toHaveBeenCalledTimes(index + 1)
    video.dispatchEvent(new Event('seeked'))
    // Each seek must finish before the decoder is reused for the next sample.
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve()
  }
  const samples = await pending
  samples.forEach((sample, index) => expect(sample.time).toBeCloseTo([0, ...times][index]!, 10))
  expect(samples.every((sample) => sample.width === 32 && sample.height === 16)).toBe(true)
  expect(pause).toHaveBeenCalledOnce()
  expect(load).toHaveBeenCalledTimes(2)
  expect(video.hasAttribute('src')).toBe(false)
  expect(videoSamplingRuntime.releaseUrl).toHaveBeenCalledExactlyOnceWith('blob:sample')
  expect(vi.getTimerCount()).toBe(0)
})

it.each(['load', 'seek'] as const)(
  'should preserve the decoding failure and release the decoder during %s',
  async (stage) => {
    vi.useFakeTimers()
    const {load, pause, video} = createDecoder()
    const pending = sampleVideo(new Blob(), new AbortController().signal)
    const assertion = expect(pending).rejects.toThrow('Video background decoding failed.')
    if (stage === 'seek') {
      video.dispatchEvent(new Event('loadeddata'))
      await Promise.resolve()
    }
    video.dispatchEvent(new Event('error'))
    await assertion
    expect(pause).toHaveBeenCalledOnce()
    expect(load).toHaveBeenCalledTimes(2)
    expect(video.hasAttribute('src')).toBe(false)
    expect(videoSamplingRuntime.releaseUrl).toHaveBeenCalledExactlyOnceWith('blob:sample')
    expect(vi.getTimerCount()).toBe(0)
  },
)

it.each(['load', 'seek'] as const)(
  'should preserve the ten-second deadline and release the decoder during %s',
  async (stage) => {
    vi.useFakeTimers()
    const {load, pause, video} = createDecoder()
    const pending = sampleVideo(new Blob(), new AbortController().signal)
    const assertion = expect(pending).rejects.toThrow('Video background decoding failed.')
    if (stage === 'seek') {
      video.dispatchEvent(new Event('loadeddata'))
      await Promise.resolve()
    }
    vi.advanceTimersByTime(9_999)
    expect(pause).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    await assertion
    expect(pause).toHaveBeenCalledOnce()
    expect(load).toHaveBeenCalledTimes(2)
    expect(video.hasAttribute('src')).toBe(false)
    expect(videoSamplingRuntime.releaseUrl).toHaveBeenCalledExactlyOnceWith('blob:sample')
    expect(vi.getTimerCount()).toBe(0)
  },
)

it('should preserve the cancellation reason while seeking and release the decoder', async () => {
  vi.useFakeTimers()
  const {load, pause, video} = createDecoder()
  const controller = new AbortController()
  const error = new Error('removed')
  const pending = sampleVideo(new Blob(), controller.signal)
  video.dispatchEvent(new Event('loadeddata'))
  await Promise.resolve()
  controller.abort(error)
  await expect(pending).rejects.toBe(error)
  expect(pause).toHaveBeenCalledOnce()
  expect(load).toHaveBeenCalledTimes(2)
  expect(video.hasAttribute('src')).toBe(false)
  expect(videoSamplingRuntime.releaseUrl).toHaveBeenCalledExactlyOnceWith('blob:sample')
  expect(vi.getTimerCount()).toBe(0)
})

it('should release an already-aborted decoder without loading its source', async () => {
  vi.useFakeTimers()
  const {draw, load, pause, seek, video} = createDecoder()
  const controller = new AbortController()
  controller.abort('already removed')
  await expect(sampleVideo(new Blob(), controller.signal)).rejects.toBe('already removed')
  expect(draw).not.toHaveBeenCalled()
  expect(seek).not.toHaveBeenCalled()
  expect(pause).toHaveBeenCalledOnce()
  expect(load).toHaveBeenCalledOnce()
  expect(video.hasAttribute('src')).toBe(false)
  expect(videoSamplingRuntime.releaseUrl).toHaveBeenCalledExactlyOnceWith('blob:sample')
  expect(vi.getTimerCount()).toBe(0)
})

it.each(['load', 'seek'] as const)(
  'should preserve a synchronous native %s exception and release the decoder',
  async (stage) => {
    vi.useFakeTimers()
    const {load, pause, seek, video} = createDecoder()
    const error = new DOMException('unavailable', 'InvalidStateError')
    if (stage === 'load') {
      load.mockImplementationOnce(() => {
        throw error
      })
    } else {
      seek.mockImplementationOnce(() => {
        throw error
      })
    }
    const pending = sampleVideo(new Blob(), new AbortController().signal)
    if (stage === 'seek') {
      video.dispatchEvent(new Event('loadeddata'))
    }
    await expect(pending).rejects.toBe(error)
    expect(pause).toHaveBeenCalledOnce()
    expect(load).toHaveBeenCalledTimes(2)
    expect(video.hasAttribute('src')).toBe(false)
    expect(videoSamplingRuntime.releaseUrl).toHaveBeenCalledExactlyOnceWith('blob:sample')
    expect(vi.getTimerCount()).toBe(0)
  },
)

it('should skip seeks within the existing epsilon', async () => {
  vi.useFakeTimers()
  const {load, seek, video} = createDecoder(0.0005)
  const pending = sampleVideo(new Blob(), new AbortController().signal)
  video.dispatchEvent(new Event('loadeddata'))
  await expect(pending).resolves.toHaveLength(1)
  expect(seek).not.toHaveBeenCalled()
  expect(load).toHaveBeenCalledTimes(2)
  expect(vi.getTimerCount()).toBe(0)
})
it('should capture an aspect-preserving color sample', () => {
  const {canvas, video} = createDecoder()
  Object.defineProperties(video, {videoHeight: {value: 400}, videoWidth: {value: 200}})
  video.currentTime = 2
  const drawImage = vi.fn()
  const pixels = new Uint8ClampedArray(16 * 32 * 4)
  vi.spyOn(canvas, 'getContext').mockReturnValue({
    drawImage,
    getImageData: () => ({data: pixels}),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  expect(captureSample(video)).toEqual({height: 32, pixels, time: 2, width: 16})
  expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 16, 32)
})
it('should reject an unavailable canvas', () => {
  const {canvas, video} = createDecoder()
  vi.mocked(canvas.getContext).mockReturnValue(null)
  expect(() => captureSample(video)).toThrow('canvas')
})
it('should release the decoder and URL when frame capture fails', async () => {
  vi.useFakeTimers()
  const {canvas, load, pause, video} = createDecoder()
  vi.mocked(canvas.getContext).mockReturnValue(null)
  const pending = sampleVideo(new Blob(), new AbortController().signal)
  const assertion = expect(pending).rejects.toThrow('Video background canvas is unavailable.')

  video.dispatchEvent(new Event('loadeddata'))
  await assertion

  expect(pause).toHaveBeenCalledOnce()
  expect(load).toHaveBeenCalledTimes(2)
  expect(video.hasAttribute('src')).toBe(false)
  expect(videoSamplingRuntime.releaseUrl).toHaveBeenCalledExactlyOnceWith('blob:sample')
  expect(vi.getTimerCount()).toBe(0)
})
it('should capture both samples for a clip shorter than the end margin', async () => {
  const {load, seek, video} = createDecoder(0.04)
  load.mockImplementationOnce(() => video.dispatchEvent(new Event('loadeddata')))
  seek.mockImplementation(() => video.dispatchEvent(new Event('seeked')))

  const samples = await sampleVideo(new Blob(), new AbortController().signal)

  expect(samples.map((sample) => sample.time)).toEqual([0, 0.04])
  expect(videoSamplingRuntime.releaseUrl).toHaveBeenCalledExactlyOnceWith('blob:sample')
})
it('should stop the decoder and release its URL when loading is aborted', async () => {
  const {load, pause} = createDecoder()
  const controller = new AbortController()
  const pending = sampleVideo(new Blob(), controller.signal)
  const assertion = expect(pending).rejects.toMatchObject({name: 'AbortError'})
  controller.abort()
  await assertion
  expect(pause).toHaveBeenCalledOnce()
  expect(load).toHaveBeenCalledTimes(2)
  expect(videoSamplingRuntime.releaseUrl).toHaveBeenCalledExactlyOnceWith('blob:sample')
})

it.each([
  {reason: undefined, stage: 'load'},
  {reason: null, stage: 'load'},
  {reason: 0, stage: 'load'},
  {reason: false, stage: 'load'},
  {reason: 'failure', stage: 'load'},
  {reason: undefined, stage: 'seek'},
  {reason: null, stage: 'seek'},
  {reason: 0, stage: 'seek'},
  {reason: false, stage: 'seek'},
  {reason: 'failure', stage: 'seek'},
])('should reject an arbitrary synchronous $stage failure: $reason', async ({reason, stage}) => {
  vi.useFakeTimers()
  const {load, seek, video} = createDecoder()
  const start = stage === 'load' ? load : seek
  start.mockImplementationOnce(() => {
    throw reason
  })
  const pending = sampleVideo(new Blob(), new AbortController().signal)
  if (stage === 'seek') {
    video.dispatchEvent(new Event('loadeddata'))
  }
  await expect(pending).rejects.toBe(reason)
  expect(video.hasAttribute('src')).toBe(false)
  expect(videoSamplingRuntime.releaseUrl).toHaveBeenCalledExactlyOnceWith('blob:sample')
  expect(vi.getTimerCount()).toBe(0)
})

it.each([null, undefined])('should preserve a nullish abort reason: %s', async (reason) => {
  vi.useFakeTimers()
  const {video} = createDecoder()
  const controller = new AbortController()
  if (reason === undefined) {
    // Native abort(undefined) supplies a DOMException; pin the direct reason propagation contract.
    vi.spyOn(controller.signal, 'reason', 'get').mockReturnValue(undefined)
  }
  const pending = sampleVideo(new Blob(), controller.signal)
  const assertion = expect(pending).rejects.toBe(reason)
  controller.abort(reason)
  await assertion
  expect(video.hasAttribute('src')).toBe(false)
  expect(videoSamplingRuntime.releaseUrl).toHaveBeenCalledExactlyOnceWith('blob:sample')
  expect(vi.getTimerCount()).toBe(0)
})

it('should retain readiness when later events and a start exception follow it', async () => {
  vi.useFakeTimers()
  const {load, video} = createDecoder(0)
  const laterFailure: unknown = undefined
  load.mockImplementationOnce(() => {
    video.dispatchEvent(new Event('loadeddata'))
    video.dispatchEvent(new Event('error'))
    throw laterFailure
  })
  await expect(sampleVideo(new Blob(), new AbortController().signal)).resolves.toHaveLength(1)
  expect(vi.getTimerCount()).toBe(0)
})

it('should retain the decoding error when readiness and a start exception follow it', async () => {
  vi.useFakeTimers()
  const {load, video} = createDecoder(0)
  const laterFailure = new Error('later failure')
  load.mockImplementationOnce(() => {
    video.dispatchEvent(new Event('error'))
    video.dispatchEvent(new Event('loadeddata'))
    throw laterFailure
  })
  await expect(sampleVideo(new Blob(), new AbortController().signal)).rejects.toThrow(
    'Video background decoding failed.',
  )
  expect(vi.getTimerCount()).toBe(0)
})

it.each(['success', 'error', 'abort', 'timeout', 'start failure'] as const)(
  'should release every load subscription and deadline after %s',
  async (outcome) => {
    vi.useFakeTimers()
    const {load, video} = createDecoder(0)
    const controller = new AbortController()
    const subscribeVideo = vi.spyOn(video, 'addEventListener')
    const unsubscribeVideo = vi.spyOn(video, 'removeEventListener')
    const subscribeSignal = vi.spyOn(controller.signal, 'addEventListener')
    const unsubscribeSignal = vi.spyOn(controller.signal, 'removeEventListener')
    if (outcome === 'start failure') {
      load.mockImplementationOnce(() => {
        throw new Error('start failure')
      })
    }
    const pending = sampleVideo(new Blob(), controller.signal)
    const assertion =
      outcome === 'success'
        ? expect(pending).resolves.toHaveLength(1)
        : expect(pending).rejects.toBeDefined()
    switch (outcome) {
      case 'success':
        video.dispatchEvent(new Event('loadeddata'))
        break
      case 'error':
        video.dispatchEvent(new Event('error'))
        break
      case 'abort':
        controller.abort('cancelled')
        break
      case 'timeout':
        vi.advanceTimersByTime(10_000)
        break
      case 'start failure':
        break
      default: {
        const unreachable: never = outcome
        throw new Error(`Unknown outcome: ${unreachable}`)
      }
    }
    await assertion
    for (const [event, listener] of subscribeVideo.mock.calls) {
      expect(unsubscribeVideo).toHaveBeenCalledWith(event, listener, false)
    }
    for (const [event, listener] of subscribeSignal.mock.calls) {
      expect(unsubscribeSignal).toHaveBeenCalledWith(event, listener, false)
    }
    expect(subscribeVideo).toHaveBeenCalledTimes(2)
    expect(subscribeSignal).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  },
)
