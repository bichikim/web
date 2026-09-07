import {describe, expect, it} from 'vitest'

import {paraglideMiddleware} from '@paraglide/server'
import {PARAGLIDE_CONFIG} from '../paraglide.config'

describe('web localization routing', () => {
  it.each([
    {localeHeaders: new Headers({Cookie: 'PARAGLIDE_LOCALE=en'}), localeSource: 'cookie'},
    {
      localeHeaders: new Headers({'Accept-Language': 'en-US,en;q=0.9'}),
      localeSource: 'preferred language',
    },
  ])(
    'should render canonical URLs in the English locale from $localeSource without redirecting',
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

  it('should render the root in the resolved language without redirecting', async () => {
    const request = new Request('https://pomofi.test/', {
      headers: {
        Cookie: 'PARAGLIDE_LOCALE=en',
        'Sec-Fetch-Dest': 'document',
      },
    })

    const response = await paraglideMiddleware(request, () => new Response())

    expect(response.status).toBe(200)
    expect(response.headers.get('Location')).toBeNull()
  })

  it('should ignore locale-looking URL segments when resolving the language', async () => {
    const request = new Request('https://pomofi.test/en/', {
      headers: {
        Cookie: 'PARAGLIDE_LOCALE=ko',
        'Sec-Fetch-Dest': 'document',
      },
    })

    const response = await paraglideMiddleware(request, ({locale, request: localizedRequest}) =>
      Response.json({locale, url: localizedRequest.url}),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Location')).toBeNull()
    await expect(response.json()).resolves.toEqual({
      locale: 'ko',
      url: 'https://pomofi.test/en/',
    })
  })

  it('should resolve web languages without a URL strategy', () => {
    expect(PARAGLIDE_CONFIG.web.strategy).toEqual(['cookie', 'preferredLanguage', 'baseLocale'])
    expect(PARAGLIDE_CONFIG.web.routeStrategies).toEqual([
      {exclude: true, match: '/api/:path(.*)?'},
      {exclude: true, match: '/workers/:path(.*)?'},
    ])
  })

  it('should resolve Apps in Toss languages from storage without a URL strategy', () => {
    expect(PARAGLIDE_CONFIG.appsInToss.strategy).toEqual(['localStorage', 'cookie', 'baseLocale'])
    expect(PARAGLIDE_CONFIG.appsInToss.routeStrategies).toEqual(
      PARAGLIDE_CONFIG.web.routeStrategies,
    )
    expect(PARAGLIDE_CONFIG.common).not.toHaveProperty('urlPatterns')
    expect(PARAGLIDE_CONFIG.common.outputStructure).toBe('message-modules')
    expect(PARAGLIDE_CONFIG.development.outputStructure).toBe('locale-modules')
  })
})
