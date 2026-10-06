/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {captureSample, sampleVideo} from '../sample'
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const createDecoder = (duration = 12) => {
  const video = document.createElement('video')
  const create = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag, options) =>
    tag === 'video' ? video : create(tag, options),
  )
  Object.defineProperties(video, {
    duration: {value: duration},
    videoHeight: {value: 1},
    videoWidth: {value: 2},
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
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: draw,
    getImageData: () => ({data: new Uint8ClampedArray(32 * 16 * 4)}),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:sample'), revokeObjectURL: vi.fn()})
  return {draw, load, pause, seek, video}
}

it('should finish each seek and capture before starting the next seek', async () => {
  vi.useFakeTimers()
  const {draw, load, pause, seek, video} = createDecoder()
  const pending = sampleVideo(new Blob(), new AbortController().signal)
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
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:sample')
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
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:sample')
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
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:sample')
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
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:sample')
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
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:sample')
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
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:sample')
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
it('should capture an aspect-preserving color sample and reject an unavailable canvas', () => {
  const video = document.createElement('video')
  Object.defineProperties(video, {videoHeight: {value: 400}, videoWidth: {value: 200}})
  video.currentTime = 2
  const drawImage = vi.fn()
  const pixels = new Uint8ClampedArray(16 * 32 * 4)
  const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
    getImageData: () => ({data: pixels}),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  expect(captureSample(video)).toEqual({height: 32, pixels, time: 2, width: 16})
  expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 16, 32)
  context.mockReturnValue(null)
  expect(() => captureSample(video)).toThrow('canvas')
})
it('should capture both samples for a clip shorter than the end margin', async () => {
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:sample'), revokeObjectURL: vi.fn()})
  let currentTime = 0
  let initialized = false
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(
    function load(this: HTMLMediaElement) {
      if (!initialized && this instanceof HTMLVideoElement) {
        initialized = true
        Object.defineProperties(this, {
          duration: {value: 0.04},
          videoHeight: {value: 2},
          videoWidth: {value: 2},
        })
        Object.defineProperty(this, 'currentTime', {
          configurable: true,
          get: () => currentTime,
          set: (time: number) => {
            currentTime = time
            this.dispatchEvent(new Event('seeked'))
          },
        })
      }
      this.dispatchEvent(new Event('loadeddata'))
    },
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    getImageData: () => ({data: new Uint8ClampedArray(32 * 32 * 4)}),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>)

  const samples = await sampleVideo(new Blob(), new AbortController().signal)

  expect(samples.map((sample) => sample.time)).toEqual([0, 0.04])
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:sample')
})
it('should stop the decoder and release its URL when loading is aborted', async () => {
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:sample'), revokeObjectURL: vi.fn()})
  const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  const controller = new AbortController()
  const pending = sampleVideo(new Blob(), controller.signal)
  const assertion = expect(pending).rejects.toMatchObject({name: 'AbortError'})
  controller.abort()
  await assertion
  expect(pause).toHaveBeenCalledOnce()
  expect(load).toHaveBeenCalledTimes(2)
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:sample')
})
