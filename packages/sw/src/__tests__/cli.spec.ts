import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest'
import type {GenerateSWOptions} from '../index'

type CliAction = (output: string, options: GenerateSWOptions) => Promise<void>
type ProcessHandler = (...arguments_: never[]) => void

const mocks = vi.hoisted(() => {
  const state = {action: undefined as CliAction | undefined}
  const command = {
    action: vi.fn((action: CliAction) => {
      state.action = action

      return command
    }),
    addOption: vi.fn(() => command),
    argument: vi.fn(() => command),
  }
  const program = {
    command: vi.fn(() => command),
    description: vi.fn(),
    name: vi.fn(),
    parse: vi.fn(),
  }

  program.name.mockReturnValue(program)
  program.description.mockReturnValue(program)

  return {command, generateSW: vi.fn(), program, state}
})

vi.mock('commander', () => ({
  Option: class {
    constructor(
      readonly flags: string,
      readonly description: string,
    ) {}

    argParser(): this {
      return this
    }
  },
  program: mocks.program,
}))
vi.mock('../index', () => ({generateSW: mocks.generateSW}))

describe('service worker CLI', () => {
  const processHandlers = new Map<string, ProcessHandler>()
  let action: CliAction
  let originalDebug: string | undefined
  let originalNodeEnv: string | undefined
  let processOn: ReturnType<typeof vi.spyOn>
  let tmpDir: string

  beforeAll(async () => {
    processOn = vi.spyOn(process, 'on').mockImplementation((event, listener) => {
      processHandlers.set(String(event), listener as ProcessHandler)

      return process
    })

    await import('../cli')

    if (!mocks.state.action) {
      throw new Error('CLI action was not registered')
    }

    action = mocks.state.action
  })

  afterAll(() => {
    processOn.mockRestore()
  })

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sw-cli-'))
    originalDebug = process.env.DEBUG
    originalNodeEnv = process.env.NODE_ENV
    delete process.env.DEBUG
    delete process.env.NODE_ENV
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.generateSW.mockReset().mockResolvedValue(undefined)
  })

  afterEach(async () => {
    if (originalDebug === undefined) {
      delete process.env.DEBUG
    } else {
      process.env.DEBUG = originalDebug
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }

    vi.restoreAllMocks()
    await fs.promises.rm(tmpDir, {force: true, recursive: true})
  })

  const requiredOptions = (overrides: Partial<GenerateSWOptions> = {}): GenerateSWOptions => ({
    assets: '**/*',
    assetsRoot: 'public',
    cwd: tmpDir,
    ...overrides,
  })

  it('should register and parse the build command', () => {
    expect(mocks.program.name).toHaveBeenCalledWith('service worker generator')
    expect(mocks.program.description).toHaveBeenCalledWith('Generate service worker')
    expect(mocks.program.command).toHaveBeenCalledWith('build')
    expect(mocks.command.addOption).toHaveBeenCalledTimes(14)
    expect(mocks.command.argument).toHaveBeenCalledWith('<string>')
    expect(mocks.program.parse).toHaveBeenCalledOnce()
  })

  it('should generate with defaults and the current working directory', async () => {
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir)

    await action('sw.js', requiredOptions({cwd: ''}))

    expect(cwd).toHaveBeenCalled()
    expect(mocks.generateSW).toHaveBeenCalledWith(
      'sw.js',
      expect.objectContaining({cwd: tmpDir, env: 'production'}),
    )
    expect(console.info).toHaveBeenCalledWith('✅ Service worker generated successfully!')
  })

  it('should load quoted and structured values from mode-specific env files', async () => {
    const templatePath = path.join(tmpDir, 'custom-sw.mjs')
    await fs.promises.writeFile(
      path.join(tmpDir, '.env.development'),
      [
        '# service worker settings',
        '',
        '=ignored',
        'SW_CACHE_NAME="env=cache"',
        "SW_CACHE_VERSION='4'",
        'SW_CACHE_MAX_ENTRIES=5',
        'SW_CACHE_MAX_AGE=60',
        'SW_LOG_SAMPLE_RATE=0.25',
        'SW_LOG_LEVEL=warn',
        'SW_LOG_ENDPOINT=https://logs.example.com',
        'SW_CACHE_STRATEGIES={"image":"cache-first"}',
        'SW_CACHE_PRIORITIES={"image":3}',
        `SW_TEMPLATE_PATH=${templatePath}`,
      ].join('\n'),
    )

    await action('sw.js', requiredOptions({env: 'development'}))

    expect(mocks.generateSW).toHaveBeenCalledWith('sw.js', {
      assets: '**/*',
      assetsRoot: 'public',
      cacheMaxAgeSeconds: 60,
      cacheMaxEntries: 5,
      cacheName: 'env=cache',
      cachePriorities: {image: 3},
      cacheStrategies: {image: 'cache-first'},
      cacheVersion: 4,
      cwd: tmpDir,
      env: 'development',
      logEndpoint: 'https://logs.example.com',
      logLevel: 'warn',
      logSampleRate: 0.25,
      swTemplatePath: templatePath,
    })
    expect(console.info).toHaveBeenCalledWith('Cache name: env=cache')
    expect(console.info).toHaveBeenCalledWith('Cache version: 4')
    expect(console.info).toHaveBeenCalledWith('Log level: warn')
    expect(console.info).toHaveBeenCalledWith('Log endpoint: https://logs.example.com')
  })

  it('should prefer direct options over env values', async () => {
    await fs.promises.writeFile(
      path.join(tmpDir, '.env'),
      [
        'SW_CACHE_VERSION=2',
        'SW_LOG_LEVEL=error',
        'SW_CACHE_STRATEGIES={"image":"network-first"}',
        'SW_CACHE_PRIORITIES={"image":1}',
      ].join('\n'),
    )

    await action(
      'sw.js',
      requiredOptions({
        cachePriorities: {image: 8},
        cacheStrategies: {image: 'network-only'},
        cacheVersion: 9,
        logLevel: 'debug',
      }),
    )

    expect(mocks.generateSW).toHaveBeenCalledWith(
      'sw.js',
      expect.objectContaining({
        cachePriorities: {image: 8},
        cacheStrategies: {image: 'network-only'},
        cacheVersion: 9,
        logLevel: 'debug',
      }),
    )
  })

  it.each([
    [undefined, requiredOptions(), 'Output path is required and must be a string'],
    [
      'sw.js',
      requiredOptions({assets: ''}),
      'Both --assets and --assets-root options are required',
    ],
  ])('should reject invalid required inputs', async (output, options, message) => {
    await expect(action(output as string, options)).rejects.toThrow(message)
  })

  it.each([
    ['SW_CACHE_VERSION=invalid', 'Cache version must be a number'],
    ['SW_CACHE_VERSION=0', 'Cache version must be a positive number'],
    ['SW_LOG_SAMPLE_RATE=2', 'Log sample rate must be between 0 and 1'],
    ['SW_LOG_LEVEL=verbose', 'Invalid log level: verbose'],
    ['SW_CACHE_STRATEGIES=invalid', 'Invalid JSON for SW_CACHE_STRATEGIES'],
    ['SW_CACHE_STRATEGIES={"unknown":"cache-first"}', 'Invalid cache strategy key: unknown'],
    ['SW_CACHE_STRATEGIES={"image":"unknown"}', 'Invalid cache strategy value: unknown'],
    ['SW_CACHE_PRIORITIES=invalid', 'Invalid JSON for SW_CACHE_PRIORITIES'],
    ['SW_CACHE_PRIORITIES={"unknown":1}', 'Invalid cache priority key: unknown'],
    ['SW_CACHE_PRIORITIES={"image":"high"}', 'Invalid cache priority value for image'],
  ])('should reject invalid env configuration', async (content, message) => {
    await fs.promises.writeFile(path.join(tmpDir, '.env'), content)

    await expect(action('sw.js', requiredOptions())).rejects.toThrow(message)
  })

  it('should reject invalid direct numeric and priority values', async () => {
    await expect(
      action('sw.js', requiredOptions({cachePriorities: {image: Number.NaN}})),
    ).rejects.toThrow('Invalid cache priority value for image')

    await expect(
      action('sw.js', requiredOptions({cacheMaxEntries: 'many' as never})),
    ).rejects.toThrow('Cache max entries must be a number')
  })

  it.each([null, ''])('should treat %s numeric options as unset', async (value) => {
    await action('sw.js', requiredOptions({cacheMaxAgeSeconds: value as never}))

    expect(mocks.generateSW).toHaveBeenCalledWith(
      'sw.js',
      expect.objectContaining({cacheMaxAgeSeconds: undefined}),
    )
  })

  it('should wrap generator errors and include a debug stack when requested', async () => {
    process.env.DEBUG = '1'
    mocks.generateSW.mockRejectedValueOnce(new Error('write failed'))

    await expect(action('sw.js', requiredOptions())).rejects.toThrow(
      'Service worker generation failed',
    )

    expect(console.error).toHaveBeenCalledWith('\nStack trace:')
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('write failed'))
  })

  it('should report an unknown non-error generator failure', async () => {
    mocks.generateSW.mockRejectedValueOnce('aborted')

    await expect(action('sw.js', requiredOptions())).rejects.toThrow(
      'Service worker generation failed',
    )

    expect(console.error).toHaveBeenCalledWith('Unknown error occurred')
  })

  it('should handle uncaught CLI and runtime errors with the appropriate exit code', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    let cliError: unknown

    try {
      await action('', requiredOptions())
    } catch (error) {
      cliError = error
    }

    processHandlers.get('uncaughtException')?.(cliError as never)
    processHandlers.get('uncaughtException')?.(new Error('runtime failure') as never)

    expect(exit).toHaveBeenNthCalledWith(1, 1)
    expect(exit).toHaveBeenNthCalledWith(2, 1)
  })

  it('should include diagnostics for uncaught errors in development', () => {
    process.env.NODE_ENV = 'development'
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    const error = new Error('uncaught')

    processHandlers.get('uncaughtException')?.(error as never)

    expect(console.error).toHaveBeenCalledWith('\nStack trace:')
    expect(console.error).toHaveBeenCalledWith(error.stack)
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('should handle unhandled rejections with optional debug context', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    const promise = Promise.resolve()

    processHandlers.get('unhandledRejection')?.('failure' as never, promise as never)
    process.env.DEBUG = '1'
    processHandlers.get('unhandledRejection')?.('debug failure' as never, promise as never)

    expect(console.error).toHaveBeenCalledWith('Reason: failure')
    expect(console.error).toHaveBeenCalledWith('Promise:', promise)
    expect(exit).toHaveBeenCalledTimes(2)
  })
})
