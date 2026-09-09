/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {captureSample, sampleVideo} from '../sample'
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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
