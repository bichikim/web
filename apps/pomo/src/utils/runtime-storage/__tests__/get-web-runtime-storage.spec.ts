/** @vitest-environment jsdom */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {getWebRuntimeStorage} from '../get-web-runtime-storage'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('getWebRuntimeStorage', () => {
  it('should reuse a driver and preserve raw storage keys across operations', () => {
    const driver = getWebRuntimeStorage()
    expect(getWebRuntimeStorage()).toBe(driver)
    driver.setItem('key:with:colons', 'value')
    expect(localStorage.getItem('key:with:colons')).toBe('value')
    expect(driver.getItem('key:with:colons')).toBe('value')
    driver.removeItem('key:with:colons')
    expect(driver.getItem('key:with:colons')).toBeNull()
  })
  it('should bind a replaced storage identity without reusing the old storage', () => {
    const original = getWebRuntimeStorage()
    vi.stubGlobal('localStorage', sessionStorage)
    const replacement = getWebRuntimeStorage()
    expect(replacement).not.toBe(original)
    replacement.setItem('replacement', 'value')
    expect(sessionStorage.getItem('replacement')).toBe('value')
    replacement.removeItem('replacement')
  })
})
