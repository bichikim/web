import {afterEach, expect, it, vi} from 'vitest'
import {loadPhoto} from '../companion'

afterEach(() => vi.restoreAllMocks())

const IMAGE_WIDTH = 4

const createPhoto = async (): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  canvas.width = IMAGE_WIDTH
  canvas.height = 2
  const context = canvas.getContext('2d')!
  context.fillStyle = 'red'
  context.fillRect(0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('Image fixture encoding failed'))
      } else {
        resolve(blob)
      }
    }, 'image/png')
  })
}

it('should load a native photo and retain its URL until the receiver releases it', async () => {
  const createUrl = vi.spyOn(URL, 'createObjectURL')
  const revokeUrl = vi.spyOn(URL, 'revokeObjectURL')
  const controller = new AbortController()
  const photo = await loadPhoto(await createPhoto(), controller.signal)
  try {
    expect(photo?.image.naturalWidth).toBe(IMAGE_WIDTH)
    expect(photo?.image.naturalHeight).toBe(2)
    controller.abort()
    expect(revokeUrl).not.toHaveBeenCalled()
    expect(photo?.image.hasAttribute('src')).toBe(true)
  } finally {
    photo?.release()
  }
  expect(photo?.image.hasAttribute('src')).toBe(false)
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith(createUrl.mock.results[0]!.value)
})

it('should release a native invalid photo on its error event', async () => {
  const createUrl = vi.spyOn(URL, 'createObjectURL')
  const revokeUrl = vi.spyOn(URL, 'revokeObjectURL')
  await expect(
    loadPhoto(new Blob(['invalid'], {type: 'image/png'}), new AbortController().signal),
  ).rejects.toThrow('Unable to load companion photo.')
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith(createUrl.mock.results[0]!.value)
})

it('should release a pending native photo synchronously on cancellation', async () => {
  const createUrl = vi.spyOn(URL, 'createObjectURL')
  const revokeUrl = vi.spyOn(URL, 'revokeObjectURL')
  const blob = await createPhoto()
  const controller = new AbortController()
  const pending = loadPhoto(blob, controller.signal)
  controller.abort()
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith(createUrl.mock.results[0]!.value)
  await expect(pending).resolves.toBeNull()
})
