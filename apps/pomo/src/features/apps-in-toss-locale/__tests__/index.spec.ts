/** @vitest-environment jsdom */

import {describe, expect, it} from 'vitest'

import {normalizeDeviceLocale, resolveAppsInTossLocale} from '../index'

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
