import {describe, expect, it} from 'vitest'

import {paraglideMiddleware} from '@paraglide/server'
import {PARAGLIDE_CONFIG} from '../paraglide.config'

const localizedRouteStrategies = PARAGLIDE_CONFIG.web.routeStrategies.filter(
  (routeStrategy) => 'strategy' in routeStrategy,
)

describe('web localization routing', () => {
  it.each([
    {localeHeaders: new Headers({Cookie: 'PARAGLIDE_LOCALE=en'}), localeSource: 'cookie'},
    {
      localeHeaders: new Headers({'Accept-Language': 'en-US,en;q=0.9'}),
      localeSource: 'preferred language',
    },
  ])(
    'should preserve the English locale from $localeSource without redirecting dialogue URLs',
    async ({localeHeaders}) => {
      const requestHeaders = new Headers(localeHeaders)
      requestHeaders.set('Sec-Fetch-Dest', 'document')
      const request = new Request('https://pomofi.test/dialogue', {
        headers: requestHeaders,
      })

      const response = await paraglideMiddleware(request, ({locale, request: localizedRequest}) =>
        Response.json({locale, url: localizedRequest.url}),
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('Location')).toBeNull()
      await expect(response.json()).resolves.toEqual({
        locale: 'en',
        url: 'https://pomofi.test/dialogue',
      })
    },
  )

  it('should redirect localized routes to the English URL', async () => {
    const request = new Request('https://pomofi.test/', {
      headers: {
        Cookie: 'PARAGLIDE_LOCALE=en',
        'Sec-Fetch-Dest': 'document',
      },
    })

    const response = await paraglideMiddleware(request, () => new Response())

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('https://pomofi.test/en/')
  })

  it('should keep routes without localized aliases on the canonical URL', () => {
    expect(PARAGLIDE_CONFIG.web.strategy).toEqual(['cookie', 'preferredLanguage', 'baseLocale'])
    expect(PARAGLIDE_CONFIG.localizedRoutes).not.toContain('/dialogue')
  })

  it('should enable the URL strategy only for routes with localized aliases', () => {
    expect(localizedRouteStrategies).toEqual(
      PARAGLIDE_CONFIG.localizedRoutes.map((match) => ({
        match,
        strategy: ['url', ...PARAGLIDE_CONFIG.web.strategy],
      })),
    )
  })
})
