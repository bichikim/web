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
  it('should remove one leading BOM before parsing a stored JSON value', () => {
    expect(parseStorageJson('\uFEFF3', parseNumber)).toBe(3)
  })

  it('should preserve BOM characters inside parsed string content', () => {
    const value = {label: '\uFEFFinside'}
    const parseValue = vi.fn((parsed: unknown) => parsed)

    expect(parseStorageJson(`\uFEFF${JSON.stringify(value)}`, parseValue)).toEqual(value)
    expect(parseValue).toHaveBeenCalledExactlyOnceWith(value)
  })

  it.each(['\uFEFF\uFEFF3', ' \uFEFF3', '\uFEFF{invalid', '\uFEFF3\uFEFF', '\uFEFF'])(
    'should reject malformed JSON after removing only one leading BOM: %s',
    (storedValue) => {
      const parseValue = vi.fn(parseNumber)
      expect(parseStorageJson(storedValue, parseValue)).toBeNull()
      expect(parseValue).not.toHaveBeenCalled()
    },
  )

  it('should retain value validation after stripping the leading BOM', () => {
    expect(parseStorageJson('\uFEFF"invalid"', parseNumber)).toBeNull()
  })

  it('should normalize missing malformed and invalid JSON values', () => {
    expect(parseStorageJson(null, parseNumber)).toBeNull()
    expect(parseStorageJson('{invalid', parseNumber)).toBeNull()
    expect(parseStorageJson('"invalid"', parseNumber)).toBeNull()
    expect(parseStorageJson('3', parseNumber)).toBe(3)
  })
})
