import {describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  cacheStore: {get: vi.fn(), put: vi.fn()},
  createCacheStore: vi.fn(),
  createLogger: vi.fn(),
  createStrategyHandlers: vi.fn(),
  log: vi.fn(),
  notifyClients: vi.fn(),
  registerFetchHandler: vi.fn(),
  registerLifecycleHandlers: vi.fn(),
  strategyHandlers: {},
}))

vi.mock('../runtime/config', () => ({
  cachePriorities: {default: 1},
  cacheStrategies: {default: 'cache-first'},
  logEndpoint: 'https://logs.example.com',
  logLevel: 'info',
  logSampleRate: 0.5,
  runtimeConfig: {
    appFiles: ['/app.js'],
    cacheMetadataName: 'app-cache-meta',
    cacheMetadataUrl: 'https://example.com/__sw_cache_metadata__',
    cacheName: 'app-cache-v2',
    cacheNamePrefix: 'app-cache',
    cacheVersion: 2,
    environment: 'production',
    origin: 'https://example.com',
    serviceWorkerConfig: {cacheMaxAgeSeconds: 60, cacheMaxEntries: 20},
  },
}))
vi.mock('../runtime/cache-store', () => ({createCacheStore: mocks.createCacheStore}))
vi.mock('../runtime/client-messages', () => ({notifyClients: mocks.notifyClients}))
vi.mock('../runtime/lifecycle', () => ({
  registerLifecycleHandlers: mocks.registerLifecycleHandlers,
}))
vi.mock('../runtime/logging', () => ({createLogger: mocks.createLogger}))
vi.mock('../runtime/routing', () => ({registerFetchHandler: mocks.registerFetchHandler}))
vi.mock('../runtime/strategies', () => ({
  createStrategyHandlers: mocks.createStrategyHandlers,
}))

describe('service worker entry', () => {
  it('should compose and register the runtime services', async () => {
    mocks.createLogger.mockReturnValue(mocks.log)
    mocks.createCacheStore.mockReturnValue(mocks.cacheStore)
    mocks.createStrategyHandlers.mockReturnValue(mocks.strategyHandlers)

    await import('../sw')

    expect(mocks.createLogger).toHaveBeenCalledWith({
      cacheVersion: 2,
      environment: 'production',
      logEndpoint: 'https://logs.example.com',
      logLevel: 'info',
      logSampleRate: 0.5,
      notifyClients: mocks.notifyClients,
    })
    expect(mocks.createCacheStore).toHaveBeenCalledWith({
      appFileUrls: new Set(['https://example.com/app.js']),
      cacheMaxAgeSeconds: 60,
      cacheMaxEntries: 20,
      cacheMetadataName: 'app-cache-meta',
      cacheMetadataUrl: 'https://example.com/__sw_cache_metadata__',
      cacheName: 'app-cache-v2',
      cachePriorities: {default: 1},
      log: mocks.log,
    })
    expect(mocks.createStrategyHandlers).toHaveBeenCalledWith({
      cacheStore: mocks.cacheStore,
      log: mocks.log,
    })
    expect(mocks.registerLifecycleHandlers).toHaveBeenCalledWith({
      appFiles: ['/app.js'],
      cacheMetadataName: 'app-cache-meta',
      cacheName: 'app-cache-v2',
      cacheNamePrefix: 'app-cache',
      cacheVersion: 2,
      log: mocks.log,
      notifyClients: mocks.notifyClients,
    })
    expect(mocks.registerFetchHandler).toHaveBeenCalledWith({
      origin: 'https://example.com',
      strategies: {default: 'cache-first'},
      strategyHandlers: mocks.strategyHandlers,
    })
  })
})
