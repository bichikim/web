/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {batch, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import * as messages from '@paraglide/message'
import {useCustomAlbumCoverImage} from '../use-custom-album-cover-image'

const decode = vi.fn<(blob: Blob) => Promise<ImageBitmap>>()

beforeEach(() => {
  decode.mockReset()
  vi.stubGlobal('createImageBitmap', decode)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cover')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should load only while open and decode the current file when reopened', async () => {
  const first = {close: vi.fn(), height: 120, width: 160} satisfies ImageBitmap
  const next = {close: vi.fn(), height: 240, width: 320} satisfies ImageBitmap
  decode.mockResolvedValueOnce(first).mockResolvedValueOnce(next)
  const [isOpen, setIsOpen] = createSignal(false)
  const [file, setFile] = createSignal(new File(['first'], 'first.png'))
  const {result} = renderHook(() =>
    useCustomAlbumCoverImage({
      get file() {
        return file()
      },
      get isOpen() {
        return isOpen()
      },
    }),
  )
  expect(decode).not.toHaveBeenCalled()
  expect(result.previewUrl()).toBeNull()

  setIsOpen(true)
  expect(result.isLoading()).toBe(true)
  await Promise.resolve()
  expect(result.imageBitmap()).toBe(first)
  expect(result.previewUrl()).toBe('blob:cover')
  expect(result.isLoading()).toBe(false)

  setIsOpen(false)
  expect(first.close).toHaveBeenCalledOnce()
  expect(result.imageBitmap()).toBeNull()
  expect(result.previewUrl()).toBeNull()
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:cover')

  const replacement = new File(['next'], 'next.png')
  setFile(replacement)
  expect(decode).toHaveBeenCalledOnce()
  setIsOpen(true)
  expect(decode).toHaveBeenLastCalledWith(replacement)
  await Promise.resolve()
  expect(result.imageBitmap()).toBe(next)
  expect(result.errorMessage()).toBeNull()
})

it('should translate decode failures and clear the message on the next open', async () => {
  decode.mockRejectedValueOnce(new Error('decode failed'))
  const [isOpen, setIsOpen] = createSignal(true)
  const {result} = renderHook(() =>
    useCustomAlbumCoverImage({
      file: new File(['invalid'], 'invalid.png'),
      get isOpen() {
        return isOpen()
      },
    }),
  )
  await Promise.resolve()

  expect(result.errorMessage()).toBe(messages.album_custom_error_cover_invalid())
  expect(result.isLoading()).toBe(false)
  const pending = Promise.withResolvers<ImageBitmap>()
  decode.mockReturnValue(pending.promise)
  setIsOpen(false)
  setIsOpen(true)

  expect(result.errorMessage()).toBeNull()
  expect(result.isLoading()).toBe(true)
})

it('should use the same translated error when image decoding is unavailable', () => {
  vi.stubGlobal('createImageBitmap', undefined)
  const {result} = renderHook(() =>
    useCustomAlbumCoverImage({file: new File([], 'cover.png'), isOpen: true}),
  )

  expect(result.errorMessage()).toBe(messages.album_custom_error_cover_invalid())
  expect(result.isLoading()).toBe(false)
  expect(URL.createObjectURL).not.toHaveBeenCalled()
})

it('should translate preview allocation failure without decoding and recover on replacement', async () => {
  const first = {close: vi.fn(), height: 120, width: 160} satisfies ImageBitmap
  const recovered = {close: vi.fn(), height: 240, width: 320} satisfies ImageBitmap
  decode.mockResolvedValueOnce(first).mockResolvedValueOnce(recovered)
  const createUrl = vi.mocked(URL.createObjectURL)
  createUrl
    .mockReturnValueOnce('blob:first')
    .mockImplementationOnce(() => {
      throw new Error('URL allocation failed')
    })
    .mockReturnValueOnce('blob:recovered')
  const [file, setFile] = createSignal(new File(['first'], 'first.png'))
  const {result, cleanup: dispose} = renderHook(() =>
    useCustomAlbumCoverImage({
      get file() {
        return file()
      },
      isOpen: true,
    }),
  )
  await Promise.resolve()

  setFile(new File(['invalid'], 'invalid.png'))

  expect(first.close).toHaveBeenCalledOnce()
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:first')
  expect(decode).toHaveBeenCalledOnce()
  expect(result.imageBitmap()).toBeNull()
  expect(result.previewUrl()).toBeNull()
  expect(result.isLoading()).toBe(false)
  expect(result.errorMessage()).toBe(messages.album_custom_error_cover_invalid())

  const next = new File(['next'], 'next.png')
  setFile(next)
  expect(decode).toHaveBeenLastCalledWith(next)
  expect(result.previewUrl()).toBe('blob:recovered')
  expect(result.errorMessage()).toBeNull()
  expect(result.isLoading()).toBe(true)
  await Promise.resolve()
  expect(result.imageBitmap()).toBe(recovered)
  dispose()
  expect(recovered.close).toHaveBeenCalledOnce()
  expect(vi.mocked(URL.revokeObjectURL).mock.calls).toEqual([['blob:first'], ['blob:recovered']])
  expect(result.previewUrl()).toBeNull()
})

it('should retain a failed decode preview until its source is cleared', async () => {
  decode.mockRejectedValue(new Error('invalid image'))
  const [isOpen, setIsOpen] = createSignal(true)
  const {result} = renderHook(() =>
    useCustomAlbumCoverImage({
      file: new File(['invalid'], 'invalid.png'),
      get isOpen() {
        return isOpen()
      },
    }),
  )
  await Promise.resolve()

  expect(result.imageBitmap()).toBeNull()
  expect(result.previewUrl()).toBe('blob:cover')
  expect(result.errorMessage()).toBe(messages.album_custom_error_cover_invalid())
  expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  setIsOpen(false)
  expect(result.previewUrl()).toBeNull()
  expect(result.errorMessage()).toBeNull()
  expect(result.isLoading()).toBe(false)
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:cover')
})

it('should retain a preview after a synchronous decoder failure until disposal', () => {
  decode.mockImplementation(() => {
    throw new Error('decoder failed')
  })
  const {result, cleanup: dispose} = renderHook(() =>
    useCustomAlbumCoverImage({
      file: new File(['image'], 'image.png'),
      isOpen: true,
    }),
  )

  expect(result.previewUrl()).toBe('blob:cover')
  expect(result.errorMessage()).toBe(messages.album_custom_error_cover_invalid())
  expect(result.isLoading()).toBe(false)
  expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  dispose()
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:cover')
})

it('should allocate each matching preview before decoding through batched source changes', async () => {
  const first = new File(['first'], 'first.png')
  const skipped = new File(['skipped'], 'skipped.png')
  const latest = new File(['latest'], 'latest.png')
  const allocations: (Blob | MediaSource)[] = []
  vi.mocked(URL.createObjectURL).mockImplementation((blob) => {
    allocations.push(blob)
    return `blob:${allocations.length}`
  })
  const pending = Promise.withResolvers<ImageBitmap>()
  decode.mockImplementation((blob) => {
    expect(allocations.at(-1)).toBe(blob)
    return pending.promise
  })
  const [file, setFile] = createSignal(first)
  const [isOpen, setIsOpen] = createSignal(true)
  const {result} = renderHook(() =>
    useCustomAlbumCoverImage({
      get file() {
        return file()
      },
      get isOpen() {
        return isOpen()
      },
    }),
  )

  batch(() => {
    setFile(skipped)
    setIsOpen(false)
    setFile(latest)
    setIsOpen(true)
  })

  expect(allocations).toEqual([first, latest])
  expect(decode.mock.calls).toEqual([[first], [latest]])
  expect(result.previewUrl()).toBe('blob:2')
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:1')
})

it('should retain both resources when a reactive record keeps the same file', async () => {
  const bitmap = {close: vi.fn(), height: 120, width: 160} satisfies ImageBitmap
  decode.mockResolvedValue(bitmap)
  const file = new File(['image'], 'image.png')
  const [record, setRecord] = createSignal({file, label: 'first'})
  const {result} = renderHook(() =>
    useCustomAlbumCoverImage({
      get file() {
        return record().file
      },
      isOpen: true,
    }),
  )
  await Promise.resolve()

  setRecord({file, label: 'next'})

  expect(decode).toHaveBeenCalledExactlyOnceWith(file)
  expect(URL.createObjectURL).toHaveBeenCalledExactlyOnceWith(file)
  expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  expect(bitmap.close).not.toHaveBeenCalled()
  expect(result.imageBitmap()).toBe(bitmap)
})

it('should close stale and disposed results without replacing the current preview', async () => {
  const first = Promise.withResolvers<ImageBitmap>()
  const latest = Promise.withResolvers<ImageBitmap>()
  decode.mockReturnValueOnce(first.promise).mockReturnValueOnce(latest.promise)
  vi.mocked(URL.createObjectURL)
    .mockReturnValueOnce('blob:first')
    .mockReturnValueOnce('blob:latest')
  const [file, setFile] = createSignal(new File(['first'], 'first.png'))
  const {result, cleanup: dispose} = renderHook(() =>
    useCustomAlbumCoverImage({
      get file() {
        return file()
      },
      isOpen: true,
    }),
  )
  setFile(new File(['latest'], 'latest.png'))
  const stale = {close: vi.fn(), height: 120, width: 160} satisfies ImageBitmap
  first.resolve(stale)
  await Promise.resolve()

  expect(stale.close).toHaveBeenCalledOnce()
  expect(result.imageBitmap()).toBeNull()
  expect(result.previewUrl()).toBe('blob:latest')
  expect(result.isLoading()).toBe(true)
  dispose()
  const disposed = {close: vi.fn(), height: 240, width: 320} satisfies ImageBitmap
  latest.resolve(disposed)
  await Promise.resolve()

  expect(disposed.close).toHaveBeenCalledOnce()
  expect(result.imageBitmap()).toBeNull()
  expect(result.previewUrl()).toBeNull()
  expect(result.errorMessage()).toBeNull()
  expect(result.isLoading()).toBe(false)
  expect(vi.mocked(URL.revokeObjectURL).mock.calls).toEqual([['blob:first'], ['blob:latest']])
})

it('should remain neutral on initial client render before resource effects run', () => {
  const pending = Promise.withResolvers<ImageBitmap>()
  decode.mockReturnValue(pending.promise)
  renderHook(() => {
    const result = useCustomAlbumCoverImage({file: new File(['image'], 'image.png'), isOpen: true})

    expect(result.imageBitmap()).toBeNull()
    expect(result.previewUrl()).toBeNull()
    expect(result.errorMessage()).toBeNull()
    expect(result.isLoading()).toBe(false)
    expect(decode).not.toHaveBeenCalled()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    return result
  })
})

it('should ignore an obsolete failure while preserving the new file resources', async () => {
  const first = Promise.withResolvers<ImageBitmap>()
  const bitmap = {close: vi.fn(), height: 120, width: 160} satisfies ImageBitmap
  decode.mockReturnValueOnce(first.promise).mockResolvedValueOnce(bitmap)
  vi.mocked(URL.createObjectURL)
    .mockReturnValueOnce('blob:first')
    .mockReturnValueOnce('blob:latest')
  const [file, setFile] = createSignal(new File(['first'], 'first.png'))
  const {result} = renderHook(() =>
    useCustomAlbumCoverImage({
      get file() {
        return file()
      },
      isOpen: true,
    }),
  )

  setFile(new File(['latest'], 'latest.png'))
  await Promise.resolve()
  first.reject(new Error('obsolete failure'))
  await Promise.resolve()

  expect(result.imageBitmap()).toBe(bitmap)
  expect(result.previewUrl()).toBe('blob:latest')
  expect(result.errorMessage()).toBeNull()
  expect(result.isLoading()).toBe(false)
  expect(bitmap.close).not.toHaveBeenCalled()
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:first')
})
