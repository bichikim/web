/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

vi.mock('@paraglide/runtime', () => ({
  cookieDomain: '',
  cookieName: 'PARAGLIDE_LOCALE',
  localStorageKey: 'PARAGLIDE_LOCALE',
  strategy: ['localStorage', 'cookie', 'baseLocale'],
}))

import {resetLocale} from '../reset'

const createStorage = () => ({
  removeCookie: vi.fn(),
  removeWeb: vi.fn(),
})

it('should clear browser local storage before the cookie in Apps in Toss', async () => {
  const storage = createStorage()

  await resetLocale(storage)

  expect(storage.removeWeb).toHaveBeenCalledWith('PARAGLIDE_LOCALE')
  expect(storage.removeWeb.mock.invocationCallOrder[0]).toBeLessThan(
    storage.removeCookie.mock.invocationCallOrder[0],
  )
})
