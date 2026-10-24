/* eslint-disable no-console */
import fs from 'node:fs'
import path from 'node:path'
import {Option, program} from 'commander'
import {
  type CachePriorityConfig,
  type CacheStrategyConfig,
  type GenerateSWOptions,
  type LogLevel,
} from './index'

const assetOption = new Option('-a, --assets <path>', 'Path to collecting asset directory')
const assetsRootOption = new Option('-r, --assets-root <path>', 'Path to assets root')
const cwdOptions = new Option('-c, --cwd <path>', 'Path to project root')
const cacheNameOption = new Option('--cache-name <name>', 'Custom cache name')
const cacheVersionOption = new Option('--cache-version <number>', 'Cache version number').argParser(
  Number,
)
const cacheMaxEntriesOption = new Option(
  '--cache-max-entries <number>',
  'Maximum cache entries',
).argParser(Number)
const cacheMaxAgeOption = new Option(
  '--cache-max-age <seconds>',
  'Cache max age in seconds',
).argParser(Number)
const cacheStrategiesOption = new Option(
  '--cache-strategies <json>',
  'Cache strategy config JSON',
).argParser(parseCacheStrategiesArgument)
const cachePrioritiesOption = new Option(
  '--cache-priorities <json>',
  'Cache priority config JSON',
).argParser(parseCachePrioritiesArgument)
const logLevelOption = new Option(
  '--log-level <level>',
  'Log level (debug, info, warn, error, silent)',
)
const logEndpointOption = new Option('--log-endpoint <url>', 'Log endpoint URL')
const logSampleRateOption = new Option(
  '--log-sample-rate <number>',
  'Log sample rate (0-1)',
).argParser(Number)
const envOption = new Option('--env <mode>', 'Environment mode (development or production)')
const swTemplateOption = new Option('--sw-template <path>', 'Custom sw.mjs template path')

const logLevels = new Set<LogLevel>(['debug', 'info', 'warn', 'error', 'silent'])
const cacheStrategyKeys = new Set([
  'document',
  'script',
  'style',
  'worker',
  'manifest',
  'image',
  'font',
  'default',
])
const cacheStrategyValues = new Set([
  'network-first',
  'cache-first',
  'stale-while-revalidate',
  'network-only',
])

class CLIError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 1,
  ) {
    super(message)
    this.name = 'CLIError'
  }
}

const parseEnvFile = (content: string) => {
  const env: Record<string, string> = {}

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim()

    if (line && !line.startsWith('#')) {
      const [key, ...rest] = line.split('=')

      if (key) {
        let value = rest.join('=').trim()

        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }

        env[key.trim()] = value
      }
    }
  }

  return env
}

const loadEnvFiles = async (cwd: string, mode: string) => {
  const candidates = ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]

  const env: Record<string, string> = {}

  const existingFiles = candidates
    .map((filename) => path.join(cwd, filename))
    .filter((filePath) => fs.existsSync(filePath))

  const contents = await Promise.all(
    existingFiles.map((filePath) => fs.promises.readFile(filePath, 'utf8')),
  )

  for (const content of contents) {
    Object.assign(env, parseEnvFile(content))
  }

  return env
}

const parseJsonOption = <T>(value: string, label: string): T => {
  try {
    return JSON.parse(value) as T
  } catch {
    throw new CLIError(`Invalid JSON for ${label}`)
  }
}

const validateLogLevel = (value: string): LogLevel => {
  if (!logLevels.has(value as LogLevel)) {
    throw new CLIError(`Invalid log level: ${value}`)
  }

  return value as LogLevel
}

const validateCacheStrategies = (value: CacheStrategyConfig): CacheStrategyConfig => {
  for (const [key, strategy] of Object.entries(value)) {
    if (!cacheStrategyKeys.has(key)) {
      throw new CLIError(`Invalid cache strategy key: ${key}`)
    }

    if (!cacheStrategyValues.has(strategy)) {
      throw new CLIError(`Invalid cache strategy value: ${strategy}`)
    }
  }

  return value
}

const validateCachePriorities = (value: CachePriorityConfig): CachePriorityConfig => {
  for (const [key, priority] of Object.entries(value)) {
    if (!cacheStrategyKeys.has(key)) {
      throw new CLIError(`Invalid cache priority key: ${key}`)
    }

    if (typeof priority !== 'number' || Number.isNaN(priority)) {
      throw new CLIError(`Invalid cache priority value for ${key}`)
    }
  }

  return value
}

function parseCacheStrategiesArgument(value: string): CacheStrategyConfig {
  return validateCacheStrategies(parseJsonOption(value, '--cache-strategies'))
}

function parseCachePrioritiesArgument(value: string): CachePriorityConfig {
  return validateCachePriorities(parseJsonOption(value, '--cache-priorities'))
}

const resolveNumber = (value: unknown, label: string): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return
  }

  const numberValue = typeof value === 'number' ? value : Number(value)

  if (Number.isNaN(numberValue)) {
    throw new CLIError(`${label} must be a number`)
  }

  return numberValue
}

const resolveEnvMode = (options: GenerateSWOptions) =>
  options.env ?? process.env.NODE_ENV ?? 'production'

const resolveLogLevelOption = (optionValue: LogLevel | undefined, envValue: string | undefined) => {
  let resolved: LogLevel | undefined

  if (optionValue) {
    resolved = validateLogLevel(optionValue)
  } else if (envValue) {
    resolved = validateLogLevel(envValue)
  }

  return resolved
}

const resolveCacheStrategiesOption = (
  optionValue: CacheStrategyConfig | undefined,
  envValue: string | undefined,
) => {
  let resolved: CacheStrategyConfig | undefined

  if (optionValue) {
    resolved = validateCacheStrategies(optionValue)
  } else if (envValue) {
    resolved = validateCacheStrategies(parseJsonOption(envValue, 'SW_CACHE_STRATEGIES'))
  }

  return resolved
}

const resolveCachePrioritiesOption = (
  optionValue: CachePriorityConfig | undefined,
  envValue: string | undefined,
) => {
  let resolved: CachePriorityConfig | undefined

  if (optionValue) {
    resolved = validateCachePriorities(optionValue)
  } else if (envValue) {
    resolved = validateCachePriorities(parseJsonOption(envValue, 'SW_CACHE_PRIORITIES'))
  }

  return resolved
}

const buildResolvedOptions = async (options: GenerateSWOptions) => {
  const cwd = options.cwd || process.cwd()
  const envMode = resolveEnvMode(options)
  const envValues = await loadEnvFiles(cwd, envMode)

  const resolvedCacheVersion = resolveNumber(
    options.cacheVersion ?? envValues.SW_CACHE_VERSION,
    'Cache version',
  )

  const resolvedCacheMaxEntries = resolveNumber(
    options.cacheMaxEntries ?? envValues.SW_CACHE_MAX_ENTRIES,
    'Cache max entries',
  )

  const resolvedCacheMaxAgeSeconds = resolveNumber(
    options.cacheMaxAgeSeconds ?? envValues.SW_CACHE_MAX_AGE,
    'Cache max age',
  )
  const resolvedLogSampleRate = resolveNumber(
    options.logSampleRate ?? envValues.SW_LOG_SAMPLE_RATE,
    'Log sample rate',
  )
  const resolvedLogLevel = resolveLogLevelOption(options.logLevel, envValues.SW_LOG_LEVEL)
  const resolvedCacheStrategies = resolveCacheStrategiesOption(
    options.cacheStrategies,
    envValues.SW_CACHE_STRATEGIES,
  )
  const resolvedCachePriorities = resolveCachePrioritiesOption(
    options.cachePriorities,
    envValues.SW_CACHE_PRIORITIES,
  )

  if (resolvedCacheVersion !== undefined && resolvedCacheVersion < 1) {
    throw new CLIError('Cache version must be a positive number')
  }

  if (
    resolvedLogSampleRate !== undefined &&
    (resolvedLogSampleRate < 0 || resolvedLogSampleRate > 1)
  ) {
    throw new CLIError('Log sample rate must be between 0 and 1')
  }

  const resolvedOptions: GenerateSWOptions = {
    ...options,
    cacheMaxAgeSeconds: resolvedCacheMaxAgeSeconds,
    cacheMaxEntries: resolvedCacheMaxEntries,
    cacheName: options.cacheName ?? envValues.SW_CACHE_NAME,
    cachePriorities: resolvedCachePriorities,
    cacheStrategies: resolvedCacheStrategies,
    cacheVersion: resolvedCacheVersion,
    cwd,
    env: (options.env ?? envValues.NODE_ENV ?? envMode) as GenerateSWOptions['env'],
    logEndpoint: options.logEndpoint ?? envValues.SW_LOG_ENDPOINT,
    logLevel: resolvedLogLevel,
    logSampleRate: resolvedLogSampleRate,
    swTemplatePath: options.swTemplatePath ?? envValues.SW_TEMPLATE_PATH,
  }

  return resolvedOptions
}

const logResolvedOptions = (arg: string, resolvedOptions: GenerateSWOptions) => {
  console.info('Generating service worker...')
  console.info(`Output: ${arg}`)
  console.info(`Assets: ${resolvedOptions.assets}`)
  console.info(`Assets root: ${resolvedOptions.assetsRoot}`)
  console.info(`Working directory: ${resolvedOptions.cwd}`)

  if (resolvedOptions.cacheName) {
    console.info(`Cache name: ${resolvedOptions.cacheName}`)
  }

  if (resolvedOptions.cacheVersion !== undefined) {
    console.info(`Cache version: ${resolvedOptions.cacheVersion}`)
  }

  if (resolvedOptions.logLevel) {
    console.info(`Log level: ${resolvedOptions.logLevel}`)
  }

  if (resolvedOptions.logEndpoint) {
    console.info(`Log endpoint: ${resolvedOptions.logEndpoint}`)
  }
}

const action = async (arg: string, options: GenerateSWOptions) => {
  try {
    if (!arg || typeof arg !== 'string') {
      throw new CLIError('Output path is required and must be a string')
    }

    if (!options.assets || !options.assetsRoot) {
      throw new CLIError('Both --assets and --assets-root options are required')
    }

    const resolvedOptions = await buildResolvedOptions(options)

    logResolvedOptions(arg, resolvedOptions)

    const {generateSW} = await import('./index')

    await generateSW(arg, resolvedOptions)
    console.info('✅ Service worker generated successfully!')
  } catch (error) {
    console.error('❌ Failed to generate service worker:')

    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)

      if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
        console.error('\nStack trace:')
        console.error(error.stack)
      }

      if (error instanceof CLIError) {
        throw error
      }
    } else {
      console.error('Unknown error occurred')
    }

    throw new CLIError('Service worker generation failed')
  }
}

program.name('service worker generator').description('Generate service worker')

program
  .command('build')
  .addOption(assetOption)
  .addOption(assetsRootOption)
  .addOption(cwdOptions)
  .addOption(cacheNameOption)
  .addOption(cacheVersionOption)
  .addOption(cacheMaxEntriesOption)
  .addOption(cacheMaxAgeOption)
  .addOption(cacheStrategiesOption)
  .addOption(cachePrioritiesOption)
  .addOption(logLevelOption)
  .addOption(logEndpointOption)
  .addOption(logSampleRateOption)
  .addOption(envOption)
  .addOption(swTemplateOption)
  .argument('<string>')
  .action(action)

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:')
  console.error(`Error: ${error.message}`)

  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.error('\nStack trace:')
    console.error(error.stack)
  }

  const exitCode = error instanceof CLIError ? error.exitCode : 1

  // eslint-disable-next-line n/no-process-exit
  process.exit(exitCode)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled promise rejection:')
  console.error(`Reason: ${reason}`)

  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.error('Promise:', promise)
  }

  // eslint-disable-next-line n/no-process-exit
  process.exit(1)
})
program.parse()
