/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'

const runtimeMocks = vi.hoisted(() => ({
  extractLocaleFromCookie: vi.fn<() => 'en' | 'ja' | 'ko' | 'zh-Hans' | undefined>(),
  extractLocaleFromNavigator: vi.fn<() => 'en' | 'ja' | 'ko' | 'zh-Hans' | undefined>(),
}))

vi.mock('@paraglide/runtime', () => ({
  baseLocale: 'ko',
  extractLocaleFromCookie: runtimeMocks.extractLocaleFromCookie,
  extractLocaleFromNavigator: runtimeMocks.extractLocaleFromNavigator,
  localStorageKey: 'pomo-locale',
  toLocale: (value: unknown) =>
    typeof value === 'string' && ['en', 'ja', 'ko', 'zh-Hans'].includes(value) ? value : undefined,
}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
  vi.doUnmock('@apps-in-toss/web-framework')
  window.localStorage.clear()
})

it('should prefer a persisted locale over the device locale', async () => {
  window.localStorage.setItem('pomo-locale', 'zh-Hans')
  runtimeMocks.extractLocaleFromCookie.mockReturnValue('ko')
  runtimeMocks.extractLocaleFromNavigator.mockReturnValue('en')
  vi.doMock('@apps-in-toss/web-framework', () => ({
    Device: {locale: 'ja'},
    getLocale: vi.fn(),
  }))

  const {getInitialAppsInTossLocale} = await import('../bootstrap')

  await expect(getInitialAppsInTossLocale()).resolves.toBe('zh-Hans')
})

it('should fall back to the framework locale API when Device has no locale', async () => {
  runtimeMocks.extractLocaleFromCookie.mockReturnValue(undefined)
  runtimeMocks.extractLocaleFromNavigator.mockReturnValue('ja')
  const getLocale = vi.fn().mockResolvedValue('en')
  vi.doMock('@apps-in-toss/web-framework', () => ({Device: undefined, getLocale}))

  const {getInitialAppsInTossLocale} = await import('../bootstrap')

  await expect(getInitialAppsInTossLocale()).resolves.toBe('en')
  expect(getLocale).toHaveBeenCalledOnce()
})

it('should use the cookie locale when browser storage has no persisted locale', async () => {
  runtimeMocks.extractLocaleFromCookie.mockReturnValue('en')
  runtimeMocks.extractLocaleFromNavigator.mockReturnValue('ko')
  vi.doMock('@apps-in-toss/web-framework', () => ({
    Device: {locale: 'ko'},
    getLocale: vi.fn(),
  }))

  const {getInitialAppsInTossLocale} = await import('../bootstrap')

  await expect(getInitialAppsInTossLocale()).resolves.toBe('en')
})

it('should use browser evidence when storage and the device framework are unavailable', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })
  runtimeMocks.extractLocaleFromCookie.mockReturnValue(undefined)
  runtimeMocks.extractLocaleFromNavigator.mockReturnValue('ja')
  vi.doMock('@apps-in-toss/web-framework', () => {
    throw new Error('framework unavailable')
  })

  const {getInitialAppsInTossLocale} = await import('../bootstrap')

  await expect(getInitialAppsInTossLocale()).resolves.toBe('ja')
})
