/// <reference types="@types/serviceworker" />

import type {CachePriorityConfig, CacheStrategyConfig, LogLevel, ServiceWorkerConfig} from './types'

declare const __CACHE_NAME__: string | undefined
declare const __CACHE_VERSION__: number | undefined
declare const __SW_CONFIG__: ServiceWorkerConfig | undefined
declare const __SW_ENV__: 'development' | 'production' | undefined
// oxlint-disable-next-line eslint-js/camelcase
declare const __inject_code__: string[]

const DEFAULT_CACHE_NAME = 'coong-cache-v1'
const DEFAULT_CACHE_VERSION = 1

export const DEFAULT_CACHE_STRATEGIES: CacheStrategyConfig = {
  default: 'cache-first',
  document: 'network-first',
  font: 'stale-while-revalidate',
  image: 'stale-while-revalidate',
  manifest: 'network-first',
  script: 'network-first',
  style: 'network-first',
  worker: 'network-first',
}

export const DEFAULT_CACHE_PRIORITIES: CachePriorityConfig = {
  default: 1,
  document: 4,
  font: 2,
  image: 2,
  manifest: 3,
  script: 4,
  style: 4,
  worker: 4,
}

const getOptionalBuildValue = <T>(readValue: () => T | undefined, fallback: T): T => {
  try {
    return readValue() ?? fallback
  } catch {
    return fallback
  }
}

const cacheName = getOptionalBuildValue(() => __CACHE_NAME__, DEFAULT_CACHE_NAME)
const cacheVersion = getOptionalBuildValue(() => __CACHE_VERSION__, DEFAULT_CACHE_VERSION)
const environment = getOptionalBuildValue(() => __SW_ENV__, 'production')
const serviceWorkerConfig = getOptionalBuildValue(() => __SW_CONFIG__, {})

export const runtimeConfig = {
  // oxlint-disable-next-line eslint-js/camelcase
  appFiles: __inject_code__,
  cacheMetadataName: `${cacheName}-meta`,
  cacheMetadataUrl: `${self.location.origin}/__sw_cache_metadata__`,
  cacheName,
  cacheNamePrefix: cacheName.replace(/-v[0-9]+$/u, ''),
  cacheVersion,
  environment,
  origin: self.location.origin,
  serviceWorkerConfig,
}

export const cacheStrategies: CacheStrategyConfig = {
  ...DEFAULT_CACHE_STRATEGIES,
  ...serviceWorkerConfig.cacheStrategies,
}

export const cachePriorities: CachePriorityConfig = {
  ...DEFAULT_CACHE_PRIORITIES,
  ...serviceWorkerConfig.cachePriorities,
}

export const logLevel: LogLevel =
  serviceWorkerConfig.logLevel ?? (environment === 'development' ? 'debug' : 'error')

export const logSampleRate =
  typeof serviceWorkerConfig.logSampleRate === 'number'
    ? Math.min(1, Math.max(0, serviceWorkerConfig.logSampleRate))
    : 1

const {logEndpoint: configuredLogEndpoint} = serviceWorkerConfig

export const logEndpoint = configuredLogEndpoint
