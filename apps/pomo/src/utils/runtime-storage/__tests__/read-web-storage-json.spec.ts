/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {readWebStorageJson} from '../read-web-storage-json'
const parseNumber = (value: unknown) => (typeof value === 'number' ? value : null)
beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
  vi.restoreAllMocks()
})
it('should normalize browser storage failures', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('read unavailable')
  })

  expect(readWebStorageJson('key', parseNumber)).toBeNull()
})
