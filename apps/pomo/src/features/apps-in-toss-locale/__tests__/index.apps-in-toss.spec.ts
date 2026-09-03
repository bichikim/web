/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

vi.mock('@paraglide/runtime', () => ({
  baseLocale: 'ko',
  cookieDomain: '',
  cookieName: 'PARAGLIDE_LOCALE',
  localStorageKey: 'PARAGLIDE_LOCALE',
  strategy: ['localStorage', 'cookie', 'baseLocale'],
  toLocale: (value: unknown) => (value === 'ko' || value === 'en' ? value : undefined),
}))

import {resetLocale} from '../index'

const createStorage = () => ({
  isNative: vi.fn(() => true),
  removeCookie: vi.fn(),
  removeNative: vi.fn(async () => undefined),
  removeWeb: vi.fn(),
})

it('should clear native and browser locale storage before the cookie in Apps in Toss', async () => {
  const storage = createStorage()

  await resetLocale(storage)

  expect(storage.removeNative).toHaveBeenCalledWith('PARAGLIDE_LOCALE')
  expect(storage.removeWeb).toHaveBeenCalledWith('PARAGLIDE_LOCALE')
  expect(storage.removeNative.mock.invocationCallOrder[0]).toBeLessThan(
    storage.removeWeb.mock.invocationCallOrder[0],
  )
  expect(storage.removeWeb.mock.invocationCallOrder[0]).toBeLessThan(
    storage.removeCookie.mock.invocationCallOrder[0],
  )
})
