/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {findCompanion, loadPhoto} from '../companion'
import type {BackgroundMedia} from '../model'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should skip videos and known incompatible photos, inspect unknown ones and stop at the first fit', async () => {
  const image = document.createElement('img')
  Object.defineProperties(image, {
    naturalHeight: {value: 1000},
    naturalWidth: {value: 600},
    src: {
      get() {
        return 'blob:test'
      },
      set() {
        queueMicrotask(() => image.onload?.(new Event('load')))
      },
    },
  })
  vi.stubGlobal(
    'Image',
    vi.fn(function createImage() {
      return image
    }),
  )
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn()})
  const load = vi.fn(async () => new Blob(['photo']))
  const sizes = new Map([['landscape', {height: 600, width: 1000}]])
  const candidates: BackgroundMedia[] = ['video', 'landscape', 'portrait', 'later'].map((id) => ({
    id,
    kind: id === 'video' ? 'video' : 'photo',
    name: id,
    size: 10,
  }))
  const result = await findCompanion({
    candidates,
    first: {height: 1000, width: 600},
    load,
    onError: vi.fn(),
    signal: new AbortController().signal,
    sizes,
    viewport: {height: 1000, width: 1400},
  })
  expect(result?.id).toBe('portrait')
  expect(load).toHaveBeenCalledExactlyOnceWith('portrait')
  expect(sizes.get('portrait')).toEqual({height: 1000, width: 600})
  result?.release()
  expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
})
it('should cancel pending decoding and release its object URL', async () => {
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn()})
  const controller = new AbortController()
  const result = loadPhoto(new Blob(['a']), controller.signal)
  controller.abort()
  await expect(result).resolves.toBeNull()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
})
