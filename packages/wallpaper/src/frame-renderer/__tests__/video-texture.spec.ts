/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'

import {Texture} from 'pixi.js'
import {createCanvasVideoTexture} from '../video-texture'

vi.mock('pixi.js', () => ({
  Texture: {from: vi.fn()},
}))

afterEach(() => {
  vi.restoreAllMocks()
})

it('should copy the first video frame into a canvas texture and update it on demand', () => {
  const drawImage = vi.fn()
  const updateTexture = vi.fn()
  const context = {drawImage} as unknown as CanvasRenderingContext2D
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never)
  vi.mocked(Texture.from).mockReturnValue({source: {update: updateTexture}} as never)
  const video = document.createElement('video')
  Object.defineProperties(video, {
    readyState: {configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA},
    videoHeight: {configurable: true, value: 480},
    videoWidth: {configurable: true, value: 640},
  })

  const resource = createCanvasVideoTexture(video)

  expect(Texture.from).toHaveBeenCalledWith(expect.any(HTMLCanvasElement))
  expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 480)
  expect(updateTexture).toHaveBeenCalledOnce()
  drawImage.mockClear()
  updateTexture.mockClear()

  resource.update()

  expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 480)
  expect(updateTexture).toHaveBeenCalledOnce()
})

it('should reject a video without decoded dimensions', () => {
  const video = document.createElement('video')

  expect(() => createCanvasVideoTexture(video)).toThrow('dimensions')
})
