/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

vi.mock('@paraglide/runtime', () => ({
  cookieDomain: '',
  cookieName: 'PARAGLIDE_LOCALE',
  localStorageKey: 'PARAGLIDE_LOCALE',
  strategy: ['localStorage', 'cookie', 'baseLocale'],
}))

import {OPTION_RESET_GROUPS} from '../index'

it('should report both Apps in Toss locale storage entries', () => {
  const languageGroup = OPTION_RESET_GROUPS.find((group) => group.id === 'language')

  expect(languageGroup?.storageKeyCount).toBe(2)
})
