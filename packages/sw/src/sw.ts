/// <reference types="@types/serviceworker" />

import {
  cachePriorities,
  cacheStrategies,
  logEndpoint,
  logLevel,
  logSampleRate,
  runtimeConfig,
} from './runtime/config'
import {createCacheStore} from './runtime/cache-store'
import {notifyClients} from './runtime/client-messages'
import {registerLifecycleHandlers} from './runtime/lifecycle'
import {createLogger} from './runtime/logging'
import {registerFetchHandler} from './runtime/routing'
import {createStrategyHandlers} from './runtime/strategies'

const log = createLogger({
  cacheVersion: runtimeConfig.cacheVersion,
  environment: runtimeConfig.environment,
  logEndpoint,
  logLevel,
  logSampleRate,
  notifyClients,
})

const appFileUrls = new Set(
  runtimeConfig.appFiles.map((file) => new URL(file, runtimeConfig.origin).toString()),
)

const cacheStore = createCacheStore({
  appFileUrls,
  cacheMaxAgeSeconds: runtimeConfig.serviceWorkerConfig.cacheMaxAgeSeconds,
  cacheMaxEntries: runtimeConfig.serviceWorkerConfig.cacheMaxEntries,
  cacheMetadataName: runtimeConfig.cacheMetadataName,
  cacheMetadataUrl: runtimeConfig.cacheMetadataUrl,
  cacheName: runtimeConfig.cacheName,
  cachePriorities,
  log,
})

const strategyHandlers = createStrategyHandlers({
  cacheStore,
  log,
})

registerLifecycleHandlers({
  appFiles: runtimeConfig.appFiles,
  cacheMetadataName: runtimeConfig.cacheMetadataName,
  cacheName: runtimeConfig.cacheName,
  cacheNamePrefix: runtimeConfig.cacheNamePrefix,
  cacheVersion: runtimeConfig.cacheVersion,
  log,
  notifyClients,
})

registerFetchHandler({
  origin: runtimeConfig.origin,
  strategies: cacheStrategies,
  strategyHandlers,
})
