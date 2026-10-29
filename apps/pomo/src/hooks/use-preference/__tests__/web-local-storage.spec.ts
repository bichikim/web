/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {webLocalStorage} from '../web-local-storage'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

it('should persist decoded preferences and return null for missing or malformed values', () => {
  const value = {muted: false, volume: 25}

  expect(webLocalStorage.read('setting')).toBeNull()
  expect(webLocalStorage.write('setting', value)).toBeNull()
  expect(localStorage.getItem('setting')).toBe(JSON.stringify(value))
  expect(webLocalStorage.read('setting')).toEqual(value)

  localStorage.setItem('setting', '{broken')
  expect(webLocalStorage.read('setting')).toBeNull()
})

it('should return persistence failures without replacing the stored preference', () => {
  localStorage.setItem('setting', '25')
  const failure = new DOMException('Quota exceeded', 'QuotaExceededError')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw failure
  })

  expect(webLocalStorage.write('setting', 50)).toBe(failure)
  expect(webLocalStorage.read('setting')).toBe(25)
})

it('should notify local-storage changes and clearing until unsubscribed', () => {
  const onChange = vi.fn()
  const unsubscribe = webLocalStorage.subscribe?.(onChange)

  globalThis.dispatchEvent(
    new StorageEvent('storage', {key: 'setting', storageArea: sessionStorage}),
  )
  expect(onChange).not.toHaveBeenCalled()

  globalThis.dispatchEvent(new StorageEvent('storage', {key: 'setting', storageArea: localStorage}))
  globalThis.dispatchEvent(new StorageEvent('storage', {key: null, storageArea: localStorage}))
  expect(onChange.mock.calls).toEqual([['setting'], [null]])

  unsubscribe?.()
  globalThis.dispatchEvent(new StorageEvent('storage', {key: 'setting', storageArea: localStorage}))
  expect(onChange).toHaveBeenCalledTimes(2)
})
