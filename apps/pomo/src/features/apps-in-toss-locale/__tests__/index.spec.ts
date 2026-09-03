/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import {normalizeDeviceLocale, resetLocale, resolveAppsInTossLocale} from '../index'
import {cookieDomain, cookieName} from '@paraglide/runtime'

const createStorage = () => ({
  isNative: vi.fn(() => false),
  removeCookie: vi.fn(),
  removeNative: vi.fn(async () => undefined),
  removeWeb: vi.fn(),
})

describe('resetLocale', () => {
  it('should clear only the configured cookie for the web strategy', async () => {
    const storage = createStorage()

    await resetLocale(storage)

    expect(storage.removeNative).not.toHaveBeenCalled()
    expect(storage.removeWeb).not.toHaveBeenCalled()
    expect(storage.removeCookie).toHaveBeenCalledWith(
      `${cookieName}=; path=/; max-age=0${cookieDomain ? `; domain=${cookieDomain}` : ''}`,
    )
  })

  it('should report cookie deletion failures', async () => {
    const storage = createStorage()
    storage.removeCookie.mockImplementation(() => {
      throw new Error('cookie unavailable')
    })

    await expect(resetLocale(storage)).rejects.toThrow('cookie unavailable')
  })
})

describe('normalizeDeviceLocale', () => {
  it('should normalize exact and regional Apps in Toss locales', () => {
    expect(normalizeDeviceLocale('ko')).toBe('ko')
    expect(normalizeDeviceLocale('ko-KR')).toBe('ko')
    expect(normalizeDeviceLocale('en_US')).toBe('en')
  })

  it('should reject unsupported and malformed locales', () => {
    expect(normalizeDeviceLocale('ja-JP')).toBeUndefined()
    expect(normalizeDeviceLocale(null)).toBeUndefined()
  })
})

describe('resolveAppsInTossLocale', () => {
  it('should prefer a persisted Pomo locale over the Apps in Toss locale', () => {
    expect(resolveAppsInTossLocale({deviceLocale: 'en-US', persistedLocale: 'ko'})).toBe('ko')
  })

  it('should use the Apps in Toss locale when no Pomo preference exists', () => {
    expect(resolveAppsInTossLocale({deviceLocale: 'en-US'})).toBe('en')
  })

  it('should use the browser locale only when the native locale is unavailable', () => {
    expect(resolveAppsInTossLocale({browserLocale: 'en', deviceLocale: 'ja-JP'})).toBe('en')
  })

  it('should use the base locale when no supported locale is available', () => {
    expect(resolveAppsInTossLocale({deviceLocale: 'ja-JP'})).toBe('ko')
  })
})
