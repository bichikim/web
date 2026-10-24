/** @vitest-environment jsdom */

import {cookieDomain, cookieName} from '@paraglide/runtime'
import {describe, expect, it, vi} from 'vitest'

import {resetLocale} from '../reset'

const createStorage = () => ({
  removeCookie: vi.fn(),
  removeWeb: vi.fn(),
})

describe('resetLocale', () => {
  it('should clear only the configured cookie for the web strategy', async () => {
    const storage = createStorage()

    await resetLocale(storage)

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
