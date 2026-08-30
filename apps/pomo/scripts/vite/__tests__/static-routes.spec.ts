import {describe, expect, it} from 'vitest'

import {createLocalizedStaticRoutes} from '../static-routes'

describe('createLocalizedStaticRoutes', () => {
  it('should keep the base locale unprefixed and prefix every additional locale', () => {
    expect(
      createLocalizedStaticRoutes({
        locales: ['ko', 'en'],
        routes: ['/', '/account'],
      }),
    ).toEqual(['/ko/', '/en/', '/ko/account/', '/en/account/'])
  })

  it('should preserve locale order for every route', () => {
    expect(
      createLocalizedStaticRoutes({
        locales: ['ko', 'en', 'ja'],
        routes: ['/focus-room'],
      }),
    ).toEqual(['/ko/focus-room/', '/en/focus-room/', '/ja/focus-room/'])
  })
})
