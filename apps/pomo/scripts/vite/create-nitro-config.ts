import type {NitroConfig, PublicAssetDir} from 'nitro/types'
import type {ContentSecurityPolicyRenderer} from './create-content-security-policy-renderer'
import {createInlineContentHashes} from './prerender-security-headers'
import {createPrerenderSecurityRules} from './create-prerender-security-rules'
import {
  resolvePrerenderRoutes,
  type ResolvePrerenderRoutesOptions,
} from './resolve-prerender-routes'

export interface CreateNitroConfigOptions extends ResolvePrerenderRoutesOptions {
  readonly baseSecurityHeaders: Record<string, string>
  readonly createContentSecurityPolicy: ContentSecurityPolicyRenderer
  readonly fontAsset: PublicAssetDir
  readonly staticSecurityHeaders: Record<string, string>
  readonly steamAsset?: PublicAssetDir
  readonly workerSecurityHeaders: Record<string, string>
}

interface NitroPrerenderRoute {
  readonly contentType?: string
  readonly contents?: string
  readonly route: string
}

interface NitroInstance {
  readonly options: {
    readonly routeRules: Record<string, {headers?: Record<string, string> | undefined}>
  }
}

export const createNitroConfig = (options: CreateNitroConfigOptions) => {
  const isStaticBuild = options.target !== 'web'
  return {
    hooks: {
      'prerender:generate'(route: NitroPrerenderRoute, nitroInstance: NitroInstance) {
        if (route.contents === undefined || !route.contentType?.includes('html')) {
          return
        }

        const hashes = createInlineContentHashes(route.contents)
        const routeRules = nitroInstance.options.routeRules[route.route] ?? {}
        nitroInstance.options.routeRules[route.route] = {
          ...routeRules,
          headers: {
            ...routeRules.headers,
            ...options.baseSecurityHeaders,
            'Content-Security-Policy-Report-Only': options.createContentSecurityPolicy(hashes),
          },
        }
      },
    },
    prerender: {
      failOnError: isStaticBuild,
      routes: resolvePrerenderRoutes(options),
    },
    publicAssets: [
      ...(options.command === 'serve' ? [{baseURL: '/', dir: './dev-public', maxAge: 0}] : []),
      ...(options.steamAsset === undefined ? [] : [options.steamAsset]),
      options.fontAsset,
    ],
    routeRules: {
      '/**': {headers: options.baseSecurityHeaders},
      '/workers/**': {headers: options.workerSecurityHeaders},
      ...createPrerenderSecurityRules({
        headers: options.staticSecurityHeaders,
        isStaticBuild,
        sharedStaticRoutes: options.sharedStaticRoutes,
      }),
    },
    ...(isStaticBuild && options.command === 'build' ? {preset: 'static' as const} : {}),
  } satisfies NitroConfig
}
