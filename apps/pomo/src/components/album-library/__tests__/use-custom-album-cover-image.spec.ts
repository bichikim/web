/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
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
