/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {writeWebStorageJson} from '../write-web-storage-json'
beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
  vi.restoreAllMocks()
})
it('should normalize browser storage failures', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('write unavailable')
  })

  expect(writeWebStorageJson('key', 3)).toBeInstanceOf(Error)
})
