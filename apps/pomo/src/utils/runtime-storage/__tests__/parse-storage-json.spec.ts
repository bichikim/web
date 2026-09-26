/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {parseStorageJson} from '../parse-storage-json'
const parseNumber = (value: unknown) => (typeof value === 'number' ? value : null)
beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  Reflect.deleteProperty(globalThis.window, 'ReactNativeWebView')
  vi.restoreAllMocks()
})

describe('parseStorageJson', () => {
  it('should normalize missing malformed and invalid JSON values', () => {
    expect(parseStorageJson(null, parseNumber)).toBeNull()
    expect(parseStorageJson('{invalid', parseNumber)).toBeNull()
    expect(parseStorageJson('"invalid"', parseNumber)).toBeNull()
    expect(parseStorageJson('3', parseNumber)).toBe(3)
  })
})
