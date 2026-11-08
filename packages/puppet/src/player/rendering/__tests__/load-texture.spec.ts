/** @vitest-environment jsdom */
import {Texture} from 'pixi.js'
import {afterEach, expect, test, vi} from 'vitest'
import {loadTexture} from '../load-texture'
import {loadTextureImage} from '../load-texture-image'

vi.mock('pixi.js', () => ({Texture: {from: vi.fn()}}))
vi.mock('../load-texture-image', () => ({loadTextureImage: vi.fn()}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

test('should upload premultiplied RGBA bytes and release the temporary canvas', async () => {
  const image = document.createElement('img')
  Object.defineProperties(image, {naturalHeight: {value: 1}, naturalWidth: {value: 2}})
  vi.mocked(loadTextureImage).mockResolvedValue(image)
  const canvas = document.createElement('canvas')
  const createElement = vi.spyOn(document, 'createElement').mockReturnValue(canvas)
  const drawImage = vi.fn()
  const getImageData = vi.fn().mockReturnValue({
    data: Uint8ClampedArray.of(255, 127, 1, 128, 17, 23, 201, 255),
  })
  const context = {drawImage, getImageData} as unknown as CanvasRenderingContext2D
  vi.spyOn(canvas, 'getContext').mockImplementation(
    (() => context) as unknown as typeof canvas.getContext,
  )
  const texture = {destroy: vi.fn()} as unknown as Texture
  vi.mocked(Texture.from).mockReturnValue(texture)
  await expect(loadTexture('source.png')).resolves.toBe(texture)
  expect(loadTextureImage).toHaveBeenCalledExactlyOnceWith('source.png')
  expect(createElement).toHaveBeenCalledExactlyOnceWith('canvas')
  expect(drawImage).toHaveBeenCalledExactlyOnceWith(image, 0, 0)
  expect(getImageData).toHaveBeenCalledExactlyOnceWith(0, 0, 2, 1)
  expect(Texture.from).toHaveBeenCalledExactlyOnceWith({
    alphaMode: 'premultiplied-alpha',
    autoGenerateMipmaps: true,
    format: 'rgba8unorm',
    height: 1,
    resource: Uint8Array.of(128, 64, 1, 128, 17, 23, 201, 255),
    scaleMode: 'linear',
    width: 2,
  })
  expect([canvas.width, canvas.height]).toEqual([0, 0])
  expect(texture.destroy).not.toHaveBeenCalled()
})

test('should release the temporary canvas when pixel access fails', async () => {
  vi.mocked(loadTextureImage).mockResolvedValue(document.createElement('img'))
  const canvas = document.createElement('canvas')
  vi.spyOn(document, 'createElement').mockReturnValue(canvas)
  vi.spyOn(canvas, 'getContext').mockReturnValue(null)
  await expect(loadTexture('source.png')).rejects.toThrow('Cannot read texture pixels')
  expect([canvas.width, canvas.height]).toEqual([0, 0])
  expect(Texture.from).not.toHaveBeenCalled()
})

test('should propagate decode errors without creating texture resources', async () => {
  const error = new Error('Invalid image')
  vi.mocked(loadTextureImage).mockRejectedValue(error)
  const createElement = vi.spyOn(document, 'createElement')
  await expect(loadTexture('source.png')).rejects.toBe(error)
  expect(createElement).not.toHaveBeenCalled()
  expect(Texture.from).not.toHaveBeenCalled()
})
