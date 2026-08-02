/// <reference types="@types/serviceworker" />

export type CacheStrategy =
  | 'network-first'
  | 'cache-first'
  | 'stale-while-revalidate'
  | 'network-only'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

export type CacheDestination = RequestDestination | 'default'

export type CacheStrategyConfig = Partial<Record<CacheDestination, CacheStrategy>>

export type CachePriorityConfig = Partial<Record<CacheDestination, number>>

export interface ServiceWorkerConfig {
  cacheMaxAgeSeconds?: number
  cacheMaxEntries?: number
  cachePriorities?: CachePriorityConfig
  cacheStrategies?: CacheStrategyConfig
  logEndpoint?: string
  logLevel?: LogLevel
  logSampleRate?: number
}

export interface CacheMetadataEntry {
  cachedAt: number
  destination: CacheDestination
  lastAccessed: number
  priority: number
}

export type CacheMetadata = Record<string, CacheMetadataEntry>

export type ServiceWorkerFetchEvent = FetchEvent

export type Logger = (level: LogLevel, message: string, details?: Record<string, unknown>) => void
