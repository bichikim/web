/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {createNitroConfig, type CreateNitroConfigOptions} from '../create-nitro-config'

const options = {
  appsInTossStaticRoutes: ['/toss'],
  baseSecurityHeaders: {'X-Content-Type-Options': 'nosniff'},
  command: 'build',
  createContentSecurityPolicy: () => 'page policy',
  desktopStaticRoutes: ['/desktop'],
  fontAsset: {baseURL: '/fonts/test', dir: './public/fonts/test', maxAge: 123},
  mobileStaticRoutes: ['/mobile'],
  sharedStaticRoutes: ['/shared'],
  staticSecurityHeaders: {'Content-Security-Policy-Report-Only': 'static policy'},
  target: 'web',
  workerSecurityHeaders: {'Content-Security-Policy-Report-Only': 'worker policy'},
} satisfies CreateNitroConfigOptions

it('should omit the signaling backend and fail standalone prerendering on startup errors', () => {
  const config = createNitroConfig({...options, standaloneRelax: true})
  expect(config.handlers).toEqual([])
  expect(config.prerender.routes).toEqual(['/relax'])
  expect(config.prerender.failOnError).toBe(true)
})

it.each(['web', 'apps-in-toss', 'desktop', 'android', 'ios'] as const)(
  'should derive the %s build policy from explicit options',
  (target) => {
    const config = createNitroConfig({...options, target})
    expect(config.preset).toBe(target === 'web' ? undefined : 'static')
    expect(config.prerender.failOnError).toBe(target !== 'web')
    expect(config.publicAssets).toEqual([options.fontAsset])
    expect(config.routeRules['/**'].headers).toEqual(options.baseSecurityHeaders)
    expect(config.routeRules['/workers/**'].headers).toEqual(options.workerSecurityHeaders)
    expect(config.routeRules).toMatchObject({'/shared': {headers: options.staticSecurityHeaders}})
    expect(Object.hasOwn(config.routeRules, '/account')).toBe(target !== 'web')
  },
)

it('should use shared routes and development assets without a static preset when serving', () => {
  const config = createNitroConfig({...options, command: 'serve', target: 'ios'})
  expect(config.preset).toBeUndefined()
  expect(config.prerender.routes).toEqual(['/shared'])
  expect(config.prerender.failOnError).toBe(true)
  expect(config.publicAssets).toEqual([
    {baseURL: '/', dir: './dev-public', maxAge: 0},
    options.fontAsset,
  ])
})

it('should emit a dedicated 300-second queue trigger only for the web backend', () => {
  expect(createNitroConfig(options).vercel?.functionRules['/api/queues/api-ai']).toEqual({
    experimentalTriggers: [{topic: 'pomo-api-ai', type: 'queue/v2beta'}],
    maxDuration: 300,
  })
  expect(createNitroConfig({...options, target: 'apps-in-toss'}).vercel).toBeUndefined()
})

it('should expose Steam assets only when the Steam distribution is configured', () => {
  const steamAsset = {baseURL: '/assets-steam', dir: './assets-steam', maxAge: 123}

  expect(createNitroConfig({...options, steamAsset}).publicAssets).toEqual([
    steamAsset,
    options.fontAsset,
  ])
})

it('should merge generated HTML security headers without dropping route rules', () => {
  const renderPolicy = vi.fn().mockReturnValue('hashed policy')
  const config = createNitroConfig({...options, createContentSecurityPolicy: renderPolicy})
  const routeRules = {'/shared': {headers: {'Cache-Control': 'no-cache'}, redirect: '/next'}}
  config.hooks['prerender:generate'](
    {
      contents: '<script nonce="build">boot()</script>',
      contentType: 'text/html; charset=utf-8',
      route: '/shared',
    },
    {options: {routeRules}},
  )
  expect(renderPolicy).toHaveBeenCalledWith({
    scriptHashes: [expect.stringMatching(/^sha256-/u)],
    styleHashes: [],
  })
  expect(routeRules['/shared']).toEqual({
    headers: {
      'Cache-Control': 'no-cache',
      ...options.baseSecurityHeaders,
      'Content-Security-Policy-Report-Only': 'hashed policy',
    },
    redirect: '/next',
  })
})

it.each([
  {contents: '{}', contentType: 'application/json', route: '/data'},
  {contentType: 'text/html', route: '/empty'},
  {contents: '<html></html>', route: '/unknown'},
])('should leave $route untouched when no HTML can be hashed', (route) => {
  const renderPolicy = vi.fn()
  const config = createNitroConfig({...options, createContentSecurityPolicy: renderPolicy})
  const routeRules = {}
  config.hooks['prerender:generate'](route, {options: {routeRules}})
  expect(renderPolicy).not.toHaveBeenCalled()
  expect(routeRules).toEqual({})
})

it('should create security headers for a generated route without existing rules', () => {
  const config = createNitroConfig(options)
  const routeRules = {}
  config.hooks['prerender:generate'](
    {contents: '<html></html>', contentType: 'text/html', route: '/generated'},
    {options: {routeRules}},
  )
  expect(routeRules).toEqual({
    '/generated': {
      headers: {
        ...options.baseSecurityHeaders,
        'Content-Security-Policy-Report-Only': 'page policy',
      },
    },
  })
})
