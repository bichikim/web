/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {useObjectUrl} from '..'

const createUrl = vi.fn<typeof URL.createObjectURL>()
const revokeUrl = vi.fn<typeof URL.revokeObjectURL>()

beforeEach(() => {
  createUrl.mockReset().mockReturnValue('blob:preview')
  revokeUrl.mockReset()
  vi.spyOn(URL, 'createObjectURL').mockImplementation(createUrl)
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeUrl)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it.each([null, undefined])('should stay empty until a Blob replaces %s', (empty) => {
  const [source, setSource] = createSignal<Blob | null | undefined>(empty)
  const {result} = renderHook(() => useObjectUrl(source))

  expect(result()).toBeUndefined()
  expect(createUrl).not.toHaveBeenCalled()
  expect(revokeUrl).not.toHaveBeenCalled()

  const blob = new Blob(['preview'])
  setSource(blob)

  expect(result()).toBe('blob:preview')
  expect(createUrl).toHaveBeenCalledExactlyOnceWith(blob)
})

it('should remain empty until client effects run', () => {
  createRoot((dispose) => {
    const result = useObjectUrl(() => new Blob(['preview']))
    expect(result()).toBeUndefined()
    expect(createUrl).not.toHaveBeenCalled()
    dispose()
  })
  expect(createUrl).not.toHaveBeenCalled()
})

it('should revoke the previous URL before creating the replacement and dispose once', () => {
  const first = new Blob(['first'])
  const next = new File(['next'], 'cover.png', {type: 'image/png'})
  const [source, setSource] = createSignal<Blob | null>(first)
  createUrl.mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:next')
  const {result, cleanup: dispose} = renderHook(() => useObjectUrl(source))

  expect(result()).toBe('blob:first')
  setSource(next)

  expect(result()).toBe('blob:next')
  expect(createUrl.mock.calls).toEqual([[first], [next]])
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:first')
  expect(revokeUrl.mock.invocationCallOrder[0]).toBeLessThan(createUrl.mock.invocationCallOrder[1])

  dispose()
  expect(result()).toBeUndefined()
  expect(revokeUrl.mock.calls).toEqual([['blob:first'], ['blob:next']])
  setSource(new Blob(['after disposal']))
  expect(createUrl).toHaveBeenCalledTimes(2)
})

it.each([null, undefined])('should revoke on clear to %s and recreate when restored', (empty) => {
  const blob = new Blob(['preview'])
  const [source, setSource] = createSignal<Blob | null | undefined>(blob)
  const {result, cleanup: dispose} = renderHook(() => useObjectUrl(source))

  setSource(empty)
  expect(result()).toBeUndefined()
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:preview')
  expect(createUrl).toHaveBeenCalledOnce()

  setSource(blob)
  expect(result()).toBe('blob:preview')
  expect(createUrl).toHaveBeenCalledTimes(2)
  dispose()
  expect(revokeUrl).toHaveBeenCalledTimes(2)
})

it('should retain the URL when a reactive source still returns the same Blob', () => {
  const blob = new Blob(['preview'])
  const [source, setSource] = createSignal({blob, label: 'first'})
  const {result, cleanup: dispose} = renderHook(() => useObjectUrl(() => source().blob))

  setSource({blob, label: 'next'})

  expect(result()).toBe('blob:preview')
  expect(createUrl).toHaveBeenCalledExactlyOnceWith(blob)
  expect(revokeUrl).not.toHaveBeenCalled()
  dispose()
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:preview')
})

it('should own independent URLs when consumers share a Blob', () => {
  const blob = new Blob(['shared'])
  createUrl.mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second')
  const first = renderHook(() => useObjectUrl(() => blob))
  const second = renderHook(() => useObjectUrl(() => blob))

  first.cleanup()

  expect(first.result()).toBeUndefined()
  expect(second.result()).toBe('blob:second')
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:first')
  second.cleanup()
  expect(revokeUrl.mock.calls).toEqual([['blob:first'], ['blob:second']])
})

it('should propagate creation failure with no URL to dispose', () => {
  const failure = new Error('URL creation failed')
  createUrl.mockImplementation(() => {
    throw failure
  })
  const [source, setSource] = createSignal<Blob | null>(null)
  const {result, cleanup: dispose} = renderHook(() => useObjectUrl(source))

  expect(() => setSource(new Blob())).toThrow(failure)
  expect(result()).toBeUndefined()
  dispose()
  expect(revokeUrl).not.toHaveBeenCalled()
})

it('should clear the revoked URL when replacement creation fails', () => {
  const failure = new Error('replacement failed')
  const [source, setSource] = createSignal<Blob | null>(new Blob())
  const {result, cleanup: dispose} = renderHook(() => useObjectUrl(source))
  createUrl.mockImplementation(() => {
    throw failure
  })

  expect(() => setSource(new Blob())).toThrow(failure)
  expect(result()).toBeUndefined()
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:preview')
  dispose()
  expect(revokeUrl).toHaveBeenCalledOnce()
})
