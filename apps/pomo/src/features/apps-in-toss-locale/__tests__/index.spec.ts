/** @vitest-environment jsdom */

import {describe, expect, it} from 'vitest'

import {normalizeDeviceLocale, resolveLocaleRedirect} from '../index'

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

describe('resolveLocaleRedirect', () => {
  it('should prefer a persisted Pomo locale over the Apps in Toss locale', () => {
    expect(
      resolveLocaleRedirect({
        currentUrl: new URL('https://pomo.test/en?source=toss#timer'),
        deviceLocale: 'en-US',
        persistedLocale: 'ko',
      })?.href,
    ).toBe('https://pomo.test/ko/?source=toss#timer')
  })

  it('should use the Apps in Toss locale when no Pomo preference exists', () => {
    expect(
      resolveLocaleRedirect({
        currentUrl: new URL('https://pomo.test/?source=toss#timer'),
        deviceLocale: 'en-US',
      })?.href,
    ).toBe('https://pomo.test/en/?source=toss#timer')
  })

  it('should prefix the base locale when entering through the locale dispatcher', () => {
    expect(
      resolveLocaleRedirect({
        currentUrl: new URL('https://pomo.test/?source=toss#timer'),
        deviceLocale: 'ko-KR',
      })?.href,
    ).toBe('https://pomo.test/ko/?source=toss#timer')
  })

  it('should use the browser locale only when the native locale is unavailable', () => {
    expect(
      resolveLocaleRedirect({
        browserLocale: 'en',
        currentUrl: new URL('https://pomo.test/'),
        deviceLocale: 'ja-JP',
      })?.pathname,
    ).toBe('/en/')
  })

  it('should not navigate when the current URL already matches', () => {
    expect(
      resolveLocaleRedirect({
        currentUrl: new URL('https://pomo.test/en/'),
        deviceLocale: 'en-US',
      }),
    ).toBeUndefined()
  })

  it('should not localize a route without a translated static page', () => {
    expect(
      resolveLocaleRedirect({
        currentUrl: new URL('https://pomo.test/dialogue'),
        deviceLocale: 'en-US',
      }),
    ).toBeUndefined()
  })

  it('should localize the account page when Apps in Toss uses English', () => {
    expect(
      resolveLocaleRedirect({
        currentUrl: new URL('https://pomo.test/account'),
        deviceLocale: 'en-US',
      })?.pathname,
    ).toBe('/en/account/')
  })
})
