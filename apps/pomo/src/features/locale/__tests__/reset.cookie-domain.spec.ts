/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

vi.mock('@paraglide/runtime', () => ({
  cookieDomain: '.pomofi.io',
  cookieName: 'PARAGLIDE_LOCALE',
  localStorageKey: 'PARAGLIDE_LOCALE',
  strategy: ['cookie', 'baseLocale'],
}))

import {resetLocale} from '../reset'

it('should clear the locale cookie from its configured domain', async () => {
  const removeCookie = vi.fn()

  await resetLocale({removeCookie, removeWeb: vi.fn()})

  expect(removeCookie).toHaveBeenCalledWith(
    'PARAGLIDE_LOCALE=; path=/; max-age=0; domain=.pomofi.io',
  )
})
