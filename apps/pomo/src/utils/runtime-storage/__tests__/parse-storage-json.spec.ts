/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {parseStorageJson} from '../parse-storage-json'
const parseNumber = (value: unknown) => (typeof value === 'number' ? value : null)
beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
  vi.restoreAllMocks()
})
it('should normalize missing malformed and invalid JSON values', () => {
  expect(parseStorageJson(null, parseNumber)).toBeNull()
  expect(parseStorageJson('{invalid', parseNumber)).toBeNull()
  expect(parseStorageJson('"invalid"', parseNumber)).toBeNull()
  expect(parseStorageJson('3', parseNumber)).toBe(3)
})
