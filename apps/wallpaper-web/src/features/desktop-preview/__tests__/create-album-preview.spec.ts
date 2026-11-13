/** @vitest-environment jsdom */
import {Application, Sprite, Texture} from 'pixi.js'
import {PhotoTransition} from '@winter-love/wallpaper/frame-renderer/transition'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createAlbumPreview} from '../create-album-preview'

vi.mock('pixi.js', () => ({Application: vi.fn(), Sprite: vi.fn(), Texture: {from: vi.fn()}}))
vi.mock('pixi.js/unsafe-eval', () => ({}))
vi.mock('@winter-love/wallpaper/frame-renderer/transition', () => ({PhotoTransition: vi.fn()}))

const render = vi.fn()
const release = vi.fn()
const decode = vi.fn()
const bitmap = {close: release, height: 1024, width: 1024}
const blob = new Blob(['cover'], {type: 'image/webp'})
const fetchImage = vi.fn()
const decodeBitmap = vi.fn()
const destroySprite = vi.fn()

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    },
  )
  vi.stubGlobal('fetch', fetchImage)
  vi.stubGlobal('createImageBitmap', decodeBitmap)
  Object.defineProperty(HTMLImageElement.prototype, 'decode', {configurable: true, value: decode})
  fetchImage.mockResolvedValue({blob: () => Promise.resolve(blob), ok: true})
  decodeBitmap.mockResolvedValue(bitmap)
  decode.mockResolvedValue(undefined)
  vi.mocked(Application).mockImplementation(function application(this: Application) {
    return Object.assign(this, {
      destroy: vi.fn(),
      init: vi.fn().mockResolvedValue(undefined),
      render,
      renderer: {resize: vi.fn()},
      stage: {addChildAt: vi.fn()},
    })
  })
  vi.mocked(PhotoTransition).mockImplementation(function transition(this: PhotoTransition) {
    return Object.assign(this, {
      cancel: vi.fn(),
      capture: vi.fn(),
      clear: vi.fn(),
      play: vi.fn().mockResolvedValue(true),
      resize: vi.fn(),
    })
  })
  vi.mocked(Texture.from).mockReturnValue({height: 1024, width: 1024} as Texture)
  vi.mocked(Sprite).mockImplementation(function sprite(this: Sprite) {
    return Object.assign(this, {
      anchor: {set: vi.fn()},
      destroy: destroySprite,
      position: {set: vi.fn()},
      scale: {set: vi.fn()},
      texture: {height: 1024, width: 1024},
    })
  })
})
afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(HTMLImageElement.prototype, 'decode')
})

test('should upload a decoded bitmap and release it with its texture', async () => {
  const preview = await createAlbumPreview(document.createElement('canvas'))
  expect(await preview.show('/cover.webp', 'fade')).toBe(true)
  expect(fetchImage).toHaveBeenCalledWith('/cover.webp')
  expect(decodeBitmap).toHaveBeenCalledWith(blob)
  expect(Texture.from).toHaveBeenCalledWith(bitmap)
  expect(decode).not.toHaveBeenCalled()
  expect(release).not.toHaveBeenCalled()
  preview.destroy()
  preview.destroy()
  expect(release).toHaveBeenCalledOnce()
  expect(destroySprite.mock.invocationCallOrder[0]).toBeLessThan(
    release.mock.invocationCallOrder[0]!,
  )
})

test.each(['cancel', 'destroy'] as const)(
  'should release a bitmap decoded after %s',
  async (action) => {
    let finish!: (value: typeof bitmap) => void
    decodeBitmap.mockReturnValue(
      new Promise<typeof bitmap>((resolve) => {
        finish = resolve
      }),
    )
    const preview = await createAlbumPreview(document.createElement('canvas'))
    const pending = preview.show('/cover.webp', 'fade')
    if (action === 'cancel') {
      preview.cancelPending()
    } else {
      preview.destroy()
    }
    finish(bitmap)
    expect(await pending).toBe(false)
    expect(Texture.from).not.toHaveBeenCalled()
    expect(release).toHaveBeenCalledOnce()
    preview.destroy()
    expect(release).toHaveBeenCalledOnce()
  },
)

test('should release a replaced image while retaining the current one', async () => {
  const next = {...bitmap, close: vi.fn()}
  decodeBitmap.mockResolvedValueOnce(bitmap).mockResolvedValueOnce(next)
  const preview = await createAlbumPreview(document.createElement('canvas'))
  await preview.show('/first.webp', 'fade')
  await preview.show('/next.webp', 'directional-wipe')
  expect(release).toHaveBeenCalledOnce()
  expect(next.close).not.toHaveBeenCalled()
  preview.destroy()
  expect(next.close).toHaveBeenCalledOnce()
})

test('should retain image decoding when bitmap decoding is unavailable', async () => {
  vi.stubGlobal('createImageBitmap', undefined)
  const preview = await createAlbumPreview(document.createElement('canvas'))
  expect(await preview.show('/cover.webp', 'fade')).toBe(true)
  expect(decode).toHaveBeenCalledOnce()
  expect(Texture.from).toHaveBeenCalledWith(expect.any(HTMLImageElement))
  expect(fetchImage).not.toHaveBeenCalled()
  preview.destroy()
})

test('should report an unsuccessful image request without uploading a texture', async () => {
  fetchImage.mockResolvedValue({ok: false, status: 404})
  const preview = await createAlbumPreview(document.createElement('canvas'))
  await expect(preview.show('/missing.webp', 'fade')).rejects.toThrow('404')
  expect(Texture.from).not.toHaveBeenCalled()
  preview.destroy()
})
