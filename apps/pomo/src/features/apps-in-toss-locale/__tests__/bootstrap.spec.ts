/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {localStorageKey} from '@paraglide/runtime'
import {getInitialAppsInTossLocale} from '../bootstrap'

const deviceMocks = vi.hoisted(() => ({
  Device: {locale: 'ko-KR'} as {locale: string} | undefined,
  getLocale: vi.fn<() => Promise<string>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => deviceMocks)

beforeEach(() => {
  deviceMocks.Device = {locale: 'ko-KR'}
  deviceMocks.getLocale.mockResolvedValue('ko-KR')
  localStorage.clear()
  document.cookie = `${localStorageKey}=; Max-Age=0; Path=/`
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should read the Apps in Toss SDK locale', async () => {
  if (deviceMocks.Device === undefined) {
    throw new Error('Expected the native Device mock')
  }

  deviceMocks.Device.locale = 'en-US'

  await expect(getInitialAppsInTossLocale()).resolves.toBe('en')
})

it('should read the async Apps in Toss DevTools locale fallback', async () => {
  deviceMocks.Device = undefined
  deviceMocks.getLocale.mockResolvedValue('en-US')

  await expect(getInitialAppsInTossLocale()).resolves.toBe('en')
})

it('should keep the persisted Pomo locale ahead of the Apps in Toss locale', async () => {
  if (deviceMocks.Device === undefined) {
    throw new Error('Expected the native Device mock')
  }

  deviceMocks.Device.locale = 'en-US'
  localStorage.setItem(localStorageKey, 'ko')

  await expect(getInitialAppsInTossLocale()).resolves.toBe('ko')
})
