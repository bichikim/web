/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {useImageBitmap} from '..'

const decode = vi.fn<(blob: Blob) => Promise<ImageBitmap>>()
const createBitmap = () => ({close: vi.fn(), height: 120, width: 160}) satisfies ImageBitmap

beforeEach(() => {
  decode.mockReset()
  vi.stubGlobal('createImageBitmap', decode)
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
  expect(result.error()).toBeNull()
  expect(result.isLoading()).toBe(false)
  expect(decode).not.toHaveBeenCalled()

  const blob = new Blob(['image'], {type: 'image/png'})
  setSource(blob)
  expect(decode).toHaveBeenCalledExactlyOnceWith(blob)
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

it('should close the previous bitmap before loading a new source', async () => {
  const first = createBitmap()
  const next = Promise.withResolvers<ImageBitmap>()
  decode.mockResolvedValueOnce(first).mockReturnValueOnce(next.promise)
  const [source, setSource] = createSignal<Blob | null>(new Blob())
  const {result, cleanup: dispose} = renderHook(() => useImageBitmap(source))
  await Promise.resolve()

  setSource(new File(['next'], 'cover.png'))

  expect(first.close).toHaveBeenCalledOnce()
  expect(result.imageBitmap()).toBeNull()
  expect(result.isLoading()).toBe(true)

  const second = createBitmap()
  next.resolve(second)
  await Promise.resolve()
  dispose()

  expect(second.close).toHaveBeenCalledOnce()
  expect(first.close).toHaveBeenCalledOnce()
  expect(result.imageBitmap()).toBeNull()
})

it('should keep the latest result when older requests resolve or reject out of order', async () => {
  const first = Promise.withResolvers<ImageBitmap>()
  const second = Promise.withResolvers<ImageBitmap>()
  const latest = Promise.withResolvers<ImageBitmap>()
  decode
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
    .mockReturnValueOnce(latest.promise)
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
  expect(result.error()).toBeNull()
  expect(result.isLoading()).toBe(false)
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
  expect(result.imageBitmap()).toBeNull()
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
  expect(result.imageBitmap()).toBeNull()
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
})

it('should expose a decode failure', async () => {
  const failure = new Error('invalid image')
  decode.mockRejectedValue(failure)
  const {result, cleanup: dispose} = renderHook(() => useImageBitmap(() => new Blob()))
  await Promise.resolve()

  expect(result.error()).toBe(failure)
  expect(result.isLoading()).toBe(false)
  expect(result.imageBitmap()).toBeNull()

  dispose()
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

it('should report unsupported image decoding', () => {
  vi.stubGlobal('createImageBitmap', undefined)
  const {result} = renderHook(() => useImageBitmap(() => new Blob()))

  expect(result.error()).toBeInstanceOf(Error)
  expect(result.isLoading()).toBe(false)
})

it('should decode without using object URLs', async () => {
  const bitmap = createBitmap()
  decode.mockResolvedValue(bitmap)
  const createUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
    throw new Error('Object URLs are unavailable')
  })
  const revokeUrl = vi.spyOn(URL, 'revokeObjectURL')
  const {result, cleanup: dispose} = renderHook(() => useImageBitmap(() => new Blob()))
  await Promise.resolve()

  expect(result.imageBitmap()).toBe(bitmap)
  expect(result.error()).toBeNull()
  expect(createUrl).not.toHaveBeenCalled()
  dispose()
  expect(bitmap.close).toHaveBeenCalledOnce()
  expect(revokeUrl).not.toHaveBeenCalled()
})

it('should report a synchronous decoder failure', () => {
  const failure = new Error('decoder failed')
  decode.mockImplementation(() => {
    throw failure
  })
  const {result, cleanup: dispose} = renderHook(() => useImageBitmap(() => new Blob()))

  expect(result.error()).toBe(failure)
  expect(result.isLoading()).toBe(false)
  dispose()
})

it('should retain a decoded bitmap when a reactive record keeps the same Blob', async () => {
  const bitmap = createBitmap()
  decode.mockResolvedValue(bitmap)
  const blob = new Blob(['image'])
  const [record, setRecord] = createSignal({blob, label: 'first'})
  const {result} = renderHook(() => useImageBitmap(() => record().blob))
  await Promise.resolve()

  setRecord({blob, label: 'next'})

  expect(decode).toHaveBeenCalledExactlyOnceWith(blob)
  expect(bitmap.close).not.toHaveBeenCalled()
  expect(result.imageBitmap()).toBe(bitmap)
  expect(result.isLoading()).toBe(false)
})
