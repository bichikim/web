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
  readonly standaloneRelax?: boolean
  readonly workerSecurityHeaders: Record<string, string>
}

const API_AI_FUNCTION_SECONDS = 300

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
    features: {websocket: !isStaticBuild || options.command === 'serve'},
    handlers:
      options.standaloneRelax || (isStaticBuild && options.command === 'build')
        ? []
        : [
            {
              handler: './src/server/file-transfer/signaling.ts',
              route: '/api/transfer/socket',
            },
          ],
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
      failOnError: isStaticBuild || options.standaloneRelax === true,
      routes: options.standaloneRelax ? ['/relax'] : resolvePrerenderRoutes(options),
    },
    ...(isStaticBuild
      ? {}
      : {
          vercel: {
            functionRules: {
              '/api/cloud-text': {maxDuration: API_AI_FUNCTION_SECONDS},
              '/api/cron/api-ai': {maxDuration: API_AI_FUNCTION_SECONDS},
              '/api/webhooks/api-ai/**': {maxDuration: API_AI_FUNCTION_SECONDS},
              '/api/webhooks/openai': {maxDuration: API_AI_FUNCTION_SECONDS},
            },
          },
        }),
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
