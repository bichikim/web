/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {useImageBitmap} from '..'

const decode = vi.fn<(blob: Blob) => Promise<ImageBitmap>>()
const createUrl = vi.fn<typeof URL.createObjectURL>()
const revokeUrl = vi.fn<(url: string) => void>()
const createBitmap = () => ({close: vi.fn(), height: 120, width: 160}) satisfies ImageBitmap

beforeEach(() => {
  decode.mockReset()
  createUrl.mockReset().mockReturnValue('blob:preview')
  revokeUrl.mockReset()
  vi.stubGlobal('createImageBitmap', decode)
  vi.spyOn(URL, 'createObjectURL').mockImplementation(createUrl)
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeUrl)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should stay idle without a source and decode a Blob when provided', async () => {
  const pending = Promise.withResolvers<ImageBitmap>()
  decode.mockReturnValue(pending.promise)
  const [source, setSource] = createSignal<Blob | null>(null)
  const {result} = renderHook(() => useImageBitmap(source))

  expect(result.imageBitmap()).toBeNull()
  expect(result.previewUrl()).toBeNull()
  expect(result.error()).toBeNull()
  expect(result.isLoading()).toBe(false)
  expect(decode).not.toHaveBeenCalled()
  expect(createUrl).not.toHaveBeenCalled()

  const blob = new Blob(['image'], {type: 'image/png'})
  setSource(blob)
  expect(decode).toHaveBeenCalledExactlyOnceWith(blob)
  expect(createUrl).toHaveBeenCalledExactlyOnceWith(blob)
  expect(result.previewUrl()).toBe('blob:preview')
  expect(result.isLoading()).toBe(true)
  expect(result.imageBitmap()).toBeNull()

  const bitmap = createBitmap()
  pending.resolve(bitmap)
  await Promise.resolve()

  expect(result.imageBitmap()).toBe(bitmap)
  expect(result.error()).toBeNull()
  expect(result.isLoading()).toBe(false)
  expect(bitmap.close).not.toHaveBeenCalled()
})

it('should close the previous bitmap and revoke its URL before loading a new source', async () => {
  const first = createBitmap()
  const next = Promise.withResolvers<ImageBitmap>()
  decode.mockResolvedValueOnce(first).mockReturnValueOnce(next.promise)
  createUrl.mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:next')
  const [source, setSource] = createSignal<Blob | null>(new Blob())
  const {result, cleanup: dispose} = renderHook(() => useImageBitmap(source))
  await Promise.resolve()

  setSource(new File(['next'], 'cover.png'))

  expect(first.close).toHaveBeenCalledOnce()
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:first')
  expect(revokeUrl.mock.invocationCallOrder[0]).toBeLessThan(createUrl.mock.invocationCallOrder[1])
  expect(result.imageBitmap()).toBeNull()
  expect(result.previewUrl()).toBe('blob:next')
  expect(result.isLoading()).toBe(true)

  const second = createBitmap()
  next.resolve(second)
  await Promise.resolve()
  dispose()

  expect(second.close).toHaveBeenCalledOnce()
  expect(first.close).toHaveBeenCalledOnce()
  expect(revokeUrl.mock.calls).toEqual([['blob:first'], ['blob:next']])
  expect(result.imageBitmap()).toBeNull()
  expect(result.previewUrl()).toBeNull()
})

it('should keep the latest result when older requests resolve or reject out of order', async () => {
  const first = Promise.withResolvers<ImageBitmap>()
  const second = Promise.withResolvers<ImageBitmap>()
  const latest = Promise.withResolvers<ImageBitmap>()
  decode
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
    .mockReturnValueOnce(latest.promise)
  createUrl
    .mockReturnValueOnce('blob:first')
    .mockReturnValueOnce('blob:second')
    .mockReturnValueOnce('blob:latest')
  const [source, setSource] = createSignal<Blob | null>(new Blob())
  const {result} = renderHook(() => useImageBitmap(source))
  setSource(new Blob())
  setSource(new Blob())

  const current = createBitmap()
  latest.resolve(current)
  await Promise.resolve()
  const obsolete = createBitmap()
  first.resolve(obsolete)
  second.reject(new Error('obsolete failure'))
  await Promise.resolve()

  expect(obsolete.close).toHaveBeenCalledOnce()
  expect(current.close).not.toHaveBeenCalled()
  expect(result.imageBitmap()).toBe(current)
  expect(result.previewUrl()).toBe('blob:latest')
  expect(result.error()).toBeNull()
  expect(result.isLoading()).toBe(false)
  expect(revokeUrl.mock.calls).toEqual([['blob:first'], ['blob:second']])
})

it('should keep the new request loading when an obsolete decode finishes first', async () => {
  const first = Promise.withResolvers<ImageBitmap>()
  const next = Promise.withResolvers<ImageBitmap>()
  decode.mockReturnValueOnce(first.promise).mockReturnValueOnce(next.promise)
  const [source, setSource] = createSignal<Blob | null>(new Blob())
  const {result} = renderHook(() => useImageBitmap(source))
  setSource(new Blob())

  const obsolete = createBitmap()
  first.resolve(obsolete)
  await Promise.resolve()

  expect(obsolete.close).toHaveBeenCalledOnce()
  expect(result.imageBitmap()).toBeNull()
  expect(result.error()).toBeNull()
  expect(result.isLoading()).toBe(true)
})

it('should release a resolved bitmap when the source is cleared', async () => {
  const bitmap = createBitmap()
  decode.mockResolvedValue(bitmap)
  const [source, setSource] = createSignal<Blob | null>(new Blob())
  const {result, cleanup: dispose} = renderHook(() => useImageBitmap(source))
  await Promise.resolve()

  setSource(null)
  dispose()

  expect(bitmap.close).toHaveBeenCalledOnce()
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:preview')
  expect(result.imageBitmap()).toBeNull()
  expect(result.previewUrl()).toBeNull()
  expect(result.error()).toBeNull()
  expect(result.isLoading()).toBe(false)
})

it('should close a bitmap that resolves after disposal without publishing it', async () => {
  const pending = Promise.withResolvers<ImageBitmap>()
  decode.mockReturnValue(pending.promise)
  const {result, cleanup: dispose} = renderHook(() => useImageBitmap(() => new Blob()))
  dispose()
  const bitmap = createBitmap()
  pending.resolve(bitmap)
  await Promise.resolve()

  expect(bitmap.close).toHaveBeenCalledOnce()
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:preview')
  expect(result.imageBitmap()).toBeNull()
  expect(result.previewUrl()).toBeNull()
  expect(result.error()).toBeNull()
  expect(result.isLoading()).toBe(false)
})

it('should ignore a failure after disposal', async () => {
  const pending = Promise.withResolvers<ImageBitmap>()
  decode.mockReturnValue(pending.promise)
  const {result, cleanup: dispose} = renderHook(() => useImageBitmap(() => new Blob()))
  dispose()
  pending.reject(new Error('late failure'))
  await Promise.resolve()

  expect(result.error()).toBeNull()
  expect(result.isLoading()).toBe(false)
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:preview')
})

it('should expose a decode failure and release the failed source URL on cleanup', async () => {
  const failure = new Error('invalid image')
  decode.mockRejectedValue(failure)
  const {result, cleanup: dispose} = renderHook(() => useImageBitmap(() => new Blob()))
  await Promise.resolve()

  expect(result.error()).toBe(failure)
  expect(result.isLoading()).toBe(false)
  expect(result.imageBitmap()).toBeNull()
  expect(result.previewUrl()).toBe('blob:preview')
  expect(revokeUrl).not.toHaveBeenCalled()

  dispose()
  expect(result.previewUrl()).toBeNull()
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:preview')
})

it('should clear a previous error when loading another source', async () => {
  const next = Promise.withResolvers<ImageBitmap>()
  decode.mockRejectedValueOnce(new Error('invalid')).mockReturnValueOnce(next.promise)
  const [source, setSource] = createSignal<Blob | null>(new Blob())
  const {result} = renderHook(() => useImageBitmap(source))
  await Promise.resolve()
  expect(result.error()).toBeInstanceOf(Error)

  setSource(new Blob())
  expect(result.error()).toBeNull()
  expect(result.isLoading()).toBe(true)
})

it('should preserve a non-Error rejection as the diagnostic cause', async () => {
  decode.mockRejectedValue('decode failed')
  const {result} = renderHook(() => useImageBitmap(() => new Blob()))
  await Promise.resolve()

  expect(result.error()).toBeInstanceOf(Error)
  expect(result.error()?.cause).toBe('decode failed')
  expect(result.isLoading()).toBe(false)
})

it('should report unsupported image decoding without allocating a URL', () => {
  vi.stubGlobal('createImageBitmap', undefined)
  const {result} = renderHook(() => useImageBitmap(() => new Blob()))

  expect(result.error()).toBeInstanceOf(Error)
  expect(result.isLoading()).toBe(false)
  expect(result.previewUrl()).toBeNull()
  expect(createUrl).not.toHaveBeenCalled()
})

it('should expose object URL creation failures without attempting to decode', () => {
  const failure = new Error('URL creation failed')
  createUrl.mockImplementation(() => {
    throw failure
  })
  const {result, cleanup: dispose} = renderHook(() => useImageBitmap(() => new Blob()))

  expect(result.error()).toBe(failure)
  expect(result.isLoading()).toBe(false)
  expect(result.previewUrl()).toBeNull()
  expect(decode).not.toHaveBeenCalled()
  dispose()
  expect(revokeUrl).not.toHaveBeenCalled()
})

it('should clean up an allocated URL when the decoder throws synchronously', () => {
  const failure = new Error('decoder failed')
  decode.mockImplementation(() => {
    throw failure
  })
  const {result, cleanup: dispose} = renderHook(() => useImageBitmap(() => new Blob()))

  expect(result.error()).toBe(failure)
  expect(result.isLoading()).toBe(false)
  dispose()
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:preview')
})
