import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {getInstallFiles} from './get-install-files'
import type {Plugin, ResolvedConfig} from 'vite'

export const INJECT_TARGET = '__inject_code__'
export const libraryRoot = path.dirname(fileURLToPath(new URL(import.meta.url)))

export type CacheStrategy = 'network-first' | 'cache-first' | 'stale-while-revalidate' | 'network-only'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

export type CacheStrategyConfig = Partial<Record<RequestDestination | 'default', CacheStrategy>>

export type CachePriorityConfig = Partial<Record<RequestDestination | 'default', number>>

/** Service worker runtime configuration injected into the template. */
export interface ServiceWorkerConfig {
  cacheMaxAgeSeconds?: number
  cacheMaxEntries?: number
  cachePriorities?: CachePriorityConfig
  cacheStrategies?: CacheStrategyConfig
  logEndpoint?: string
  logLevel?: LogLevel
  logSampleRate?: number
}

/** Options for generating the service worker output. */
export interface GenerateSWOptions {
  assets: string
  assetsRoot: string
  cacheMaxAgeSeconds?: number
  cacheMaxEntries?: number
  cacheName?: string
  cachePriorities?: CachePriorityConfig
  cacheStrategies?: CacheStrategyConfig
  cacheVersion?: number
  cwd: string
  env?: 'development' | 'production'
  logEndpoint?: string
  logLevel?: LogLevel
  logSampleRate?: number
  swTemplatePath?: string
}

export interface GenerateSwPluginOptions {
  assetsPattern?: string
  cacheMaxAgeSeconds?: number
  cacheMaxEntries?: number
  cacheName?: string
  cachePriorities?: CachePriorityConfig
  cacheStrategies?: CacheStrategyConfig
  cacheVersion?: number
  env?: 'development' | 'production'
  logEndpoint?: string
  logLevel?: LogLevel
  logSampleRate?: number
  publicPath?: string
  root?: string
  swTemplatePath?: string
}

const normalizeEnv = (env?: string): 'development' | 'production' => {
  return env === 'development' ? 'development' : 'production'
}

const normalizeConfig = (config: ServiceWorkerConfig): ServiceWorkerConfig => {
  const normalized: ServiceWorkerConfig = {...config}

  if (normalized.cacheStrategies && Object.keys(normalized.cacheStrategies).length === 0) {
    delete normalized.cacheStrategies
  }

  if (normalized.cachePriorities && Object.keys(normalized.cachePriorities).length === 0) {
    delete normalized.cachePriorities
  }

  return normalized
}

const applyTemplate = (
  template: string,
  replacements: Record<string, string | undefined>,
  requiredTokens: string[] = [],
) => {
  for (const token of requiredTokens) {
    if (!template.includes(token)) {
      throw new Error(`Template missing required token: ${token}`)
    }
  }

  let result = template

  for (const [token, value] of Object.entries(replacements)) {
    if (value !== undefined) {
      result = result.replaceAll(token, value)
    }
  }

  return result
}

/** Generate a service worker file from the template. */
export const generateSW = async (distribution: string, options: GenerateSWOptions): Promise<void> => {
  const {
    assets,
    assetsRoot,
    cwd = process.cwd(),
    cacheName,
    cacheVersion,
    cacheStrategies,
    cachePriorities,
    cacheMaxEntries,
    cacheMaxAgeSeconds,
    logLevel,
    logEndpoint,
    logSampleRate,
    env,
    swTemplatePath,
  } = options

  try {
    const swTemplate = swTemplatePath ?? path.join(libraryRoot, 'sw.mjs')
    let swFile: string

    try {
      swFile = await fs.promises.readFile(swTemplate, 'utf8')
    } catch (error) {
      throw new Error(
        `Failed to read service worker template at` +
          `${swTemplate}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    let installFiles: string[]

    try {
      installFiles = await getInstallFiles({cwd, files: assets, root: assetsRoot})
    } catch (error) {
      throw new Error(
        `Failed to get install files from ` +
          `${assets} in ${assetsRoot}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    if (!Array.isArray(installFiles)) {
      throw new TypeError(`Invalid install files: expected array, got ${typeof installFiles}`)
    }

    const outputPath = path.join(cwd, distribution)

    const swConfig = normalizeConfig({
      cacheMaxAgeSeconds,
      cacheMaxEntries,
      cachePriorities,
      cacheStrategies,
      logEndpoint,
      logLevel,
      logSampleRate,
    })

    const resolvedEnv = normalizeEnv(env ?? process.env.NODE_ENV)

    const generatedContent = applyTemplate(
      swFile,
      {
        __CACHE_NAME__: cacheName ? JSON.stringify(cacheName) : undefined,
        __CACHE_VERSION__: cacheVersion === undefined ? undefined : JSON.stringify(cacheVersion),
        __SW_CONFIG__: Object.keys(swConfig).length > 0 ? JSON.stringify(swConfig) : undefined,
        __SW_ENV__: JSON.stringify(resolvedEnv),
        [INJECT_TARGET]: JSON.stringify(installFiles),
      },
      [INJECT_TARGET],
    )

    try {
      await fs.promises.writeFile(outputPath, generatedContent)
    } catch (error) {
      throw new Error(
        `Failed to write service worker to ${outputPath}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed to')) {
      throw error
    }
    throw new Error(`Service worker generation failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * create generate sw plugin
 */
export const generateSwWithCleanUp = (
  options: GenerateSwPluginOptions,
): {cleanUp: () => Promise<void>; pluginOptions: Plugin} => {
  const {
    publicPath = 'public',
    root,
    assetsPattern = '_build/assets/**/*',
    cacheName,
    cacheVersion,
    cacheStrategies,
    cachePriorities,
    cacheMaxEntries,
    cacheMaxAgeSeconds,
    logLevel,
    logEndpoint,
    logSampleRate,
    env,
    swTemplatePath,
  } = options

  interface SolidStartRouter {
    outDir: string
    type: string
  }

  interface SolidStartConfig extends ResolvedConfig {
    router: SolidStartRouter
  }

  let _config: SolidStartConfig | undefined

  const cleanUp = async () => {
    if (!_config) {
      return
    }

    await fs.promises.rm(path.join(root ?? _config.root, publicPath, 'sw.js'), {force: true})
  }

  return {
    cleanUp,
    pluginOptions: {
      async closeBundle() {
        if (!_config) {
          return
        }
        const {outDir} = _config.router
        const swOutPath = path.join(root ?? _config.root, publicPath, 'sw.js')

        await generateSW(swOutPath, {
          assets: assetsPattern,
          assetsRoot: outDir,
          cacheMaxAgeSeconds,
          cacheMaxEntries,
          cacheName,
          cachePriorities,
          cacheStrategies,
          cacheVersion,
          cwd: '',
          env,
          logEndpoint,
          logLevel,
          logSampleRate,
          swTemplatePath,
        })
      },
      configResolved(config: ResolvedConfig) {
        function isSolidStartConfig(config: ResolvedConfig): config is SolidStartConfig {
          return (
            'router' in config &&
            typeof config.router === 'object' &&
            config.router !== null &&
            'type' in config.router &&
            'outDir' in config.router &&
            typeof (config.router as any).type === 'string' &&
            typeof (config.router as any).outDir === 'string'
          )
        }

        if (isSolidStartConfig(config) && config.router.type === 'client' && config.mode === 'production') {
          _config = config
        }
      },
      name: 'generate-sw',
    },
  }
}
