/** @vitest-environment node */
import {expect, it} from 'vitest'
import {resolvePrerenderRoutes} from '../resolve-prerender-routes'

const routes = {
  appsInTossStaticRoutes: ['/toss'],
  desktopStaticRoutes: ['/desktop'],
  mobileStaticRoutes: ['/mobile'],
  sharedStaticRoutes: ['/', '/policy', '/'],
}

it.each([
  {expected: routes.sharedStaticRoutes, target: 'web'},
  {expected: routes.appsInTossStaticRoutes, target: 'apps-in-toss'},
  {expected: routes.desktopStaticRoutes, target: 'desktop'},
  {expected: routes.mobileStaticRoutes, target: 'android'},
  {expected: routes.mobileStaticRoutes, target: 'ios'},
] as const)(
  'should select $target build routes without mutating the source',
  ({target, expected}) => {
    const result = resolvePrerenderRoutes({...routes, command: 'build', target})
    expect(result).toEqual(expected)
    expect(result).not.toBe(expected)
  },
)

it.each(['web', 'apps-in-toss', 'desktop', 'android', 'ios'] as const)(
  'should retain shared routes for %s development',
  (target) => {
    expect(resolvePrerenderRoutes({...routes, command: 'serve', target})).toEqual(
      routes.sharedStaticRoutes,
    )
  },
)

it('should preserve an empty route selection', () => {
  expect(
    resolvePrerenderRoutes({...routes, command: 'build', mobileStaticRoutes: [], target: 'ios'}),
  ).toEqual([])
})
