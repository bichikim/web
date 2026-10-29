import {afterEach, expect, it, vi} from 'vitest'
import {sampleVideo} from '../sample'
import {videoSamplingRuntime} from '../runtime'
import {sampleTimes} from '../timeline'

afterEach(() => vi.restoreAllMocks())

const PIXEL_CHANNELS = 4

const observeDecoder = () => {
  const video = document.createElement('video')
  const canvases: HTMLCanvasElement[] = []
  const events: string[] = []
  video.addEventListener('loadeddata', () => events.push('loadeddata'))
  video.addEventListener('seeked', () => events.push('seeked'))
  vi.spyOn(videoSamplingRuntime, 'createVideo').mockReturnValue(video)
  vi.spyOn(videoSamplingRuntime, 'createCanvas').mockImplementation(() => {
    const canvas = document.createElement('canvas')
    canvases.push(canvas)
    return canvas
  })
  const createUrl = vi.spyOn(URL, 'createObjectURL')
  const revokeUrl = vi.spyOn(URL, 'revokeObjectURL')
  const expectReleased = () => {
    expect(video.paused).toBe(true)
    expect(video.hasAttribute('src')).toBe(false)
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith(createUrl.mock.results[0]!.value)
  }
  return {canvases, events, expectReleased, video}
}

it('should capture samples after native load and sequential seek completion, then release the decoder', async () => {
  const {canvases, events, expectReleased, video} = observeDecoder()
  const response = await fetch('/tour/pomodoro-duration.webm')
  expect(response.ok).toBe(true)
  let loadedDuration = 0
  video.addEventListener(
    'loadeddata',
    () => {
      const {duration} = video
      loadedDuration = duration
    },
    {once: true},
  )
  const samples = await sampleVideo(await response.blob(), new AbortController().signal)
  expect(events).toEqual(['loadeddata', ...samples.slice(1).map(() => 'seeked')])
  expect(samples).toHaveLength(sampleTimes(loadedDuration).length)
  samples.forEach((sample, index) => {
    expect(sample.time).toBeCloseTo(sampleTimes(loadedDuration)[index]!)
    expect(sample.pixels).toHaveLength(sample.width * sample.height * PIXEL_CHANNELS)
    const canvas = canvases[index]!
    expect(sample.width).toBe(canvas.width)
    expect(sample.height).toBe(canvas.height)
    expect(sample.pixels).toEqual(
      canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data,
    )
  })
  expectReleased()
})

it('should release a native decoder after a media error', async () => {
  const {expectReleased} = observeDecoder()
  await expect(
    sampleVideo(new Blob(['invalid'], {type: 'video/webm'}), new AbortController().signal),
  ).rejects.toThrow('Video background decoding failed.')
  expectReleased()
})

it('should preserve the cancellation reason and release a pending native decoder', async () => {
  const {expectReleased} = observeDecoder()
  const response = await fetch('/tour/pomodoro-duration.webm')
  const blob = await response.blob()
  const controller = new AbortController()
  const reason = new Error('removed')
  const pending = sampleVideo(blob, controller.signal)
  controller.abort(reason)
  await expect(pending).rejects.toBe(reason)
  expectReleased()
})
