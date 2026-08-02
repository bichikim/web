import {afterEach, describe, expect, it, vi} from 'vitest'
import type {ServiceWorkerConfig} from '../types'

interface BuildGlobals {
  cacheName?: string
  cacheVersion?: number
  config?: ServiceWorkerConfig
  environment?: 'development' | 'production'
}

const importConfig = async (buildGlobals: BuildGlobals = {}) => {
  vi.resetModules()
  vi.stubGlobal('self', {location: {origin: 'https://example.com'}})
  vi.stubGlobal('__inject_code__', ['/app.js'])

  if ('cacheName' in buildGlobals) {
    vi.stubGlobal('__CACHE_NAME__', buildGlobals.cacheName)
  }

  if ('cacheVersion' in buildGlobals) {
    vi.stubGlobal('__CACHE_VERSION__', buildGlobals.cacheVersion)
  }

  if ('config' in buildGlobals) {
    vi.stubGlobal('__SW_CONFIG__', buildGlobals.config)
  }

  if ('environment' in buildGlobals) {
    vi.stubGlobal('__SW_ENV__', buildGlobals.environment)
  }

  return import('../config')
}

describe('runtime config', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('should use production defaults when optional build values are absent', async () => {
    const config = await importConfig()

    expect(config.runtimeConfig).toMatchObject({
      appFiles: ['/app.js'],
      cacheMetadataName: 'coong-cache-v1-meta',
      cacheMetadataUrl: 'https://example.com/__sw_cache_metadata__',
      cacheName: 'coong-cache-v1',
      cacheNamePrefix: 'coong-cache',
      cacheVersion: 1,
      environment: 'production',
      origin: 'https://example.com',
      serviceWorkerConfig: {},
    })
    expect(config.cacheStrategies).toEqual(config.DEFAULT_CACHE_STRATEGIES)
    expect(config.cachePriorities).toEqual(config.DEFAULT_CACHE_PRIORITIES)
    expect(config.logLevel).toBe('error')
    expect(config.logSampleRate).toBe(1)
    expect(config.logEndpoint).toBeUndefined()
  })

  it('should merge build values and clamp an excessive sample rate', async () => {
    const config = await importConfig({
      cacheName: 'custom-cache-v8',
      cacheVersion: 8,
      config: {
        cachePriorities: {image: 9},
        cacheStrategies: {image: 'cache-first'},
        logEndpoint: 'https://logs.example.com',
        logLevel: 'warn',
        logSampleRate: 2,
      },
      environment: 'development',
    })

    expect(config.runtimeConfig).toMatchObject({
      cacheName: 'custom-cache-v8',
      cacheNamePrefix: 'custom-cache',
      cacheVersion: 8,
      environment: 'development',
    })
    expect(config.cacheStrategies.image).toBe('cache-first')
    expect(config.cachePriorities.image).toBe(9)
    expect(config.logLevel).toBe('warn')
    expect(config.logSampleRate).toBe(1)
    expect(config.logEndpoint).toBe('https://logs.example.com')
  })

  it('should use defaults for build globals explicitly replaced with undefined', async () => {
    const config = await importConfig({
      cacheName: undefined,
      cacheVersion: undefined,
      config: undefined,
      environment: undefined,
    })

    expect(config.runtimeConfig).toMatchObject({
      cacheName: 'coong-cache-v1',
      cacheVersion: 1,
      environment: 'production',
      serviceWorkerConfig: {},
    })
  })

  it('should use the development log default and clamp a negative sample rate', async () => {
    const config = await importConfig({
      config: {logSampleRate: -1},
      environment: 'development',
    })

    expect(config.logLevel).toBe('debug')
    expect(config.logSampleRate).toBe(0)
  })
})
