import {describe, expect, it} from 'vitest'

import {
  PARAGLIDE_LOCALIZED_ROUTES,
  PARAGLIDE_ROUTE_STRATEGIES,
  PARAGLIDE_WEB_STRATEGY,
} from '../../../../paraglide.config'

const localizedRouteStrategies = PARAGLIDE_ROUTE_STRATEGIES.filter(
  (routeStrategy) => 'strategy' in routeStrategy,
)

describe('web localization routing', () => {
  it('should keep routes without localized aliases on the canonical URL', () => {
    expect(PARAGLIDE_WEB_STRATEGY).toEqual(['cookie', 'preferredLanguage', 'baseLocale'])
    expect(PARAGLIDE_LOCALIZED_ROUTES).not.toContain('/dialogue')
  })

  it('should enable the URL strategy only for routes with localized aliases', () => {
    expect(localizedRouteStrategies).toEqual(
      PARAGLIDE_LOCALIZED_ROUTES.map((match) => ({
        match,
        strategy: ['url', ...PARAGLIDE_WEB_STRATEGY],
      })),
    )
  })
})
