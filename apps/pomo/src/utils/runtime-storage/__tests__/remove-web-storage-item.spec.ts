/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {removeWebStorageItem} from '../remove-web-storage-item'
beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
  vi.restoreAllMocks()
})
it('should remove only the requested browser storage item', () => {
  localStorage.setItem('old', '1')
  localStorage.setItem('other', '2')
  expect(removeWebStorageItem('old')).toBeNull()
  expect(localStorage.getItem('old')).toBeNull()
  expect(localStorage.getItem('other')).toBe('2')
})

it('should report browser storage removal failures', () => {
  const error = new Error('blocked')
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw error
  })
  expect(removeWebStorageItem('old')).toBe(error)
})
