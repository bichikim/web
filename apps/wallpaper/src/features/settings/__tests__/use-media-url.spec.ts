/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {useMediaUrl} from '../use-media-url'

beforeEach(() => {
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn()})
})
afterEach(() => vi.unstubAllGlobals())

it('should release each owned preview URL on selection change and unmount', async () => {
  const first = Promise.withResolvers<Blob>()
  const second = Promise.withResolvers<Blob>()
  const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const [id, setId] = createSignal<string | null>('first')
  const hook = renderHook(() => useMediaUrl({id, load}))
  first.resolve(new Blob(['first']))
  await first.promise
  expect(hook.result.url()).toBe('blob:preview')
  setId('second')
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
  expect(hook.result.url()).toBeNull()
  second.resolve(new Blob(['second']))
  await second.promise
  hook.cleanup()
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
})

it('should discard stale loads and recover after a preview load fails', async () => {
  const stale = Promise.withResolvers<Blob>()
  const failed = Promise.withResolvers<Blob>()
  const load = vi.fn().mockReturnValueOnce(stale.promise).mockReturnValueOnce(failed.promise)
  const [id, setId] = createSignal<string | null>('first')
  const hook = renderHook(() => useMediaUrl({id, load}))
  setId('second')
  stale.resolve(new Blob(['stale']))
  await stale.promise
  expect(URL.createObjectURL).not.toHaveBeenCalled()
  failed.reject(new Error('missing'))
  await failed.promise.catch(() => undefined)
  expect(hook.result.failed()).toBe(true)
  setId(null)
  expect(hook.result.failed()).toBe(false)
  hook.cleanup()
})
