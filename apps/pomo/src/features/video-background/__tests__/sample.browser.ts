import {afterEach, expect, it, vi} from 'vitest'
import {videoSamplingRuntime} from '../runtime'
import {sampleVideo} from '../sample'

afterEach(() => vi.restoreAllMocks())

it('should sample native WebM frames and release the decoder without cancelling its caller', async () => {
  const response = await fetch('/tour/memory-assist-picture-diary.webm')
  expect(response.ok).toBe(true)
  const video = document.createElement('video')
  vi.spyOn(videoSamplingRuntime, 'createVideo').mockReturnValue(video)
  const release = vi.spyOn(videoSamplingRuntime, 'releaseUrl')
  const controller = new AbortController()

  const samples = await sampleVideo(await response.blob(), controller.signal)
  const expected = {height: 24, lastTime: 3.95, pixelBytes: 3072, width: 32}

  expect(samples).toHaveLength(2)
  expect(samples[0]!.time).toBe(0)
  expect(samples[1]!.time).toBeCloseTo(expected.lastTime)
  for (const sample of samples) {
    expect(sample.width).toBe(expected.width)
    expect(sample.height).toBe(expected.height)
    expect(sample.pixels).toHaveLength(expected.pixelBytes)
  }
  expect(controller.signal.aborted).toBe(false)
  expect(video.paused).toBe(true)
  expect(video.hasAttribute('src')).toBe(false)
  expect(release).toHaveBeenCalledOnce()
})

it('should preserve cancellation during native readiness dispatch and release the decoder', async () => {
  const response = await fetch('/tour/memory-assist-picture-diary.webm')
  expect(response.ok).toBe(true)
  const video = document.createElement('video')
  vi.spyOn(videoSamplingRuntime, 'createVideo').mockReturnValue(video)
  const release = vi.spyOn(videoSamplingRuntime, 'releaseUrl')
  const controller = new AbortController()
  const reason = new Error('cancelled during readiness')
  video.addEventListener('loadeddata', () => controller.abort(reason), {once: true})

  await expect(sampleVideo(await response.blob(), controller.signal)).rejects.toBe(reason)

  expect(video.paused).toBe(true)
  expect(video.hasAttribute('src')).toBe(false)
  expect(release).toHaveBeenCalledOnce()
})

it('should reject native decode errors and release the decoder without cancelling its caller', async () => {
  const video = document.createElement('video')
  vi.spyOn(videoSamplingRuntime, 'createVideo').mockReturnValue(video)
  const release = vi.spyOn(videoSamplingRuntime, 'releaseUrl')
  const controller = new AbortController()

  await expect(
    sampleVideo(new Blob(['invalid video'], {type: 'video/webm'}), controller.signal),
  ).rejects.toThrow('Video background decoding failed.')

  expect(controller.signal.aborted).toBe(false)
  expect(video.paused).toBe(true)
  expect(video.hasAttribute('src')).toBe(false)
  expect(release).toHaveBeenCalledOnce()
})
