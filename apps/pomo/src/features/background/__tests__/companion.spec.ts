/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {findCompanion, loadPhoto} from '../companion'
import type {BackgroundMedia} from '../model'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const createPhoto = () => {
  const image = document.createElement('img')
  vi.stubGlobal(
    'Image',
    vi.fn(function createImage() {
      return image
    }),
  )
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn()})
  return image
}

it('should transfer successful photo ownership synchronously and ignore later cancellation', async () => {
  vi.useFakeTimers()
  const image = createPhoto()
  const controller = new AbortController()
  const pending = loadPhoto(new Blob(['photo']), controller.signal)
  image.dispatchEvent(new Event('load'))
  expect(vi.getTimerCount()).toBe(0)
  controller.abort()
  expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  const loaded = await pending
  expect(loaded?.image).toBe(image)
  expect(image.hasAttribute('src')).toBe(true)
  loaded?.release()
  expect(image.hasAttribute('src')).toBe(false)
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:photo')
})

it.each(['error', 'abort', 'timeout'] as const)(
  'should release the photo synchronously after %s',
  async (outcome) => {
    vi.useFakeTimers()
    const image = createPhoto()
    const controller = new AbortController()
    const pending = loadPhoto(new Blob(['photo']), controller.signal)
    const assertion =
      outcome === 'abort'
        ? expect(pending).resolves.toBeNull()
        : expect(pending).rejects.toThrow('Unable to load companion photo.')
    if (outcome === 'abort') {
      controller.abort()
    } else if (outcome === 'error') {
      image.dispatchEvent(new Event('error'))
    } else {
      vi.advanceTimersByTime(9999)
      expect(URL.revokeObjectURL).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
    }
    expect(image.hasAttribute('src')).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:photo')
    expect(vi.getTimerCount()).toBe(0)
    image.dispatchEvent(new Event('load'))
    image.dispatchEvent(new Event('error'))
    controller.abort()
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
    await assertion
  },
)

it('should allocate no photo or URL when already cancelled', async () => {
  createPhoto()
  const controller = new AbortController()
  controller.abort()
  await expect(loadPhoto(new Blob(), controller.signal)).resolves.toBeNull()
  expect(Image).not.toHaveBeenCalled()
  expect(URL.createObjectURL).not.toHaveBeenCalled()
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
        queueMicrotask(() => image.dispatchEvent(new Event('load')))
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
