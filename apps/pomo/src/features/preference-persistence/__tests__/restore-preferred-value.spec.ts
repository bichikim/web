import {expect, it, vi} from 'vitest'
import {restorePreferredValue} from '..'

it('should await repair of a present value without reading fallback storage', async () => {
  const pending = Promise.withResolvers<void>()
  const repair = vi.fn(() => pending.promise)
  const restore = vi.fn(async () => 2)
  const completed = vi.fn()
  const result = restorePreferredValue({preferred: 0, repair, restore}).then(completed)
  expect(repair).toHaveBeenCalledExactlyOnceWith(0)
  expect(restore).not.toHaveBeenCalled()
  expect(completed).not.toHaveBeenCalled()
  pending.resolve()
  await result
  expect(completed).toHaveBeenCalledExactlyOnceWith(0)
})

it('should restore only absent values and preserve repair failures', async () => {
  const failure = new Error('repair failed')
  const repair = vi.fn(async () => {
    throw failure
  })
  const restore = vi.fn(async () => 2)
  await expect(restorePreferredValue({preferred: null, repair, restore})).resolves.toBe(2)
  expect(repair).not.toHaveBeenCalled()
  await expect(restorePreferredValue({preferred: 1, repair, restore})).rejects.toBe(failure)
  expect(restore).toHaveBeenCalledOnce()
})
