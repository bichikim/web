/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {readWebStorageJson} from '../read-web-storage-json'
const parseNumber = (value: unknown) => (typeof value === 'number' ? value : null)
beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  Reflect.deleteProperty(globalThis.window, 'ReactNativeWebView')
  vi.restoreAllMocks()
})

describe('readWebStorageJson', () => {
  it('should normalize browser storage failures', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read unavailable')
    })

    expect(readWebStorageJson('key', parseNumber)).toBeNull()
  })

  it('should synchronously restore a value stored under an existing browser key', () => {
    localStorage.setItem('pomo:setting:v1', '3')

    expect(readWebStorageJson('pomo:setting:v1', parseNumber)).toBe(3)
  })
})
