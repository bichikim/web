import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {Plugin, ResolvedConfig} from 'vite'
import {getInstallFiles} from '../get-install-files'
import {
  generateSwPlugin,
  generateSwWithCleanUp,
  installSwBuildHooks,
  type VinxiAppLike,
} from '../index'

vi.mock('../get-install-files', () => ({getInstallFiles: vi.fn()}))

interface CallablePlugin {
  closeBundle: () => Promise<void>
  configResolved: (config: ResolvedConfig) => void
}

interface CallableEnvironmentPlugin {
  applyToEnvironment: (environment: {name: string}) => boolean
  closeBundle: (this: {environment: {config: ResolvedConfig}}) => Promise<void>
}

const asCallablePlugin = (plugin: Plugin): CallablePlugin => plugin as unknown as CallablePlugin
const asResolvedConfig = (config: Record<string, unknown>): ResolvedConfig =>
  config as unknown as ResolvedConfig
const asCallableEnvironmentPlugin = (plugin: Plugin): CallableEnvironmentPlugin =>
  plugin as unknown as CallableEnvironmentPlugin

describe('service worker build plugin', () => {
  let tmpDir: string
  let templatePath: string

  beforeEach(async () => {
    vi.clearAllMocks()
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sw-plugin-'))
    templatePath = path.join(tmpDir, 'sw.mjs')
    await fs.promises.mkdir(path.join(tmpDir, 'public'), {recursive: true})
    await fs.promises.writeFile(templatePath, 'const APP_FILES = __inject_code__')
    vi.mocked(getInstallFiles).mockResolvedValue(['/app.js'])
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await fs.promises.rm(tmpDir, {force: true, recursive: true})
  })

  it('should do nothing before an output path is available', async () => {
    const result = generateSwWithCleanUp({})
    const plugin = asCallablePlugin(result.pluginOptions)

    await expect(result.cleanUp()).resolves.toBeUndefined()
    await expect(plugin.closeBundle()).resolves.toBeUndefined()
  })

  it('should remove a configured root output even before a build', async () => {
    const outputPath = path.join(tmpDir, 'public', 'sw.js')
    await fs.promises.writeFile(outputPath, 'old worker')

    const result = generateSwWithCleanUp({root: tmpDir})

    await result.cleanUp()

    await expect(fs.promises.stat(outputPath)).rejects.toThrow()
  })

  it('should generate a worker only for the Vite client environment', async () => {
    const plugin = asCallableEnvironmentPlugin(
      generateSwPlugin({assetsPattern: '**/*', swTemplatePath: templatePath}),
    )
    const config = asResolvedConfig({
      build: {outDir: 'public'},
      root: tmpDir,
    })

    expect(plugin.applyToEnvironment({name: 'client'})).toBe(true)
    expect(plugin.applyToEnvironment({name: 'ssr'})).toBe(false)

    await plugin.closeBundle.call({environment: {config}})

    await expect(
      fs.promises.readFile(path.join(tmpDir, 'public', 'sw.js'), 'utf8'),
    ).resolves.toContain('["/app.js"]')
  })

  it('should generate and clean up the production client worker', async () => {
    const result = generateSwWithCleanUp({
      assetsPattern: '**/*',
      cacheMaxAgeSeconds: 60,
      cacheMaxEntries: 20,
      cacheName: 'plugin-cache',
      cachePriorities: {script: 8},
      cacheStrategies: {script: 'cache-first'},
      cacheVersion: 3,
      env: 'development',
      logEndpoint: 'https://logs.example.com',
      logLevel: 'info',
      logSampleRate: 0.5,
      publicPath: 'public',
      swTemplatePath: templatePath,
    })
    const plugin = asCallablePlugin(result.pluginOptions)
    const config = asResolvedConfig({
      mode: 'production',
      root: tmpDir,
      router: {outDir: path.join(tmpDir, 'assets'), type: 'client'},
    })

    plugin.configResolved(config)
    await result.cleanUp()
    await plugin.closeBundle()

    const outputPath = path.join(tmpDir, 'public', 'sw.js')
    await expect(fs.promises.readFile(outputPath, 'utf8')).resolves.toContain('["/app.js"]')

    await result.cleanUp()
    await expect(fs.promises.stat(outputPath)).rejects.toThrow()
  })

  it('should ignore non-production and non-client configurations', async () => {
    const result = generateSwWithCleanUp({root: tmpDir, swTemplatePath: templatePath})
    const plugin = asCallablePlugin(result.pluginOptions)
    const baseConfig = {root: tmpDir, router: {outDir: 'assets', type: 'client'}}

    plugin.configResolved(asResolvedConfig({...baseConfig, mode: 'development'}))
    plugin.configResolved(
      asResolvedConfig({
        ...baseConfig,
        mode: 'production',
        router: {outDir: 'assets', type: 'server'},
      }),
    )

    await plugin.closeBundle()
    expect(getInstallFiles).not.toHaveBeenCalled()
  })

  it('should ignore configurations without a valid SolidStart router', async () => {
    const result = generateSwWithCleanUp({root: tmpDir, swTemplatePath: templatePath})
    const plugin = asCallablePlugin(result.pluginOptions)
    const invalidRouters: Array<Record<string, unknown>> = [
      {},
      {router: null},
      {router: 'client'},
      {router: {}},
      {router: {type: 'client'}},
      {router: {outDir: 'assets'}},
      {router: {outDir: 'assets', type: 1}},
      {router: {outDir: 1, type: 'client'}},
    ]

    for (const config of invalidRouters) {
      plugin.configResolved(asResolvedConfig({mode: 'production', root: tmpDir, ...config}))
    }

    await plugin.closeBundle()
    expect(getInstallFiles).not.toHaveBeenCalled()
  })

  it('should install hooks and preserve existing router plugins', async () => {
    const hook = vi.fn<VinxiAppLike['hooks']['hook']>()
    const existingPlugin: Plugin = {name: 'existing'}
    const previousPlugins = vi.fn(async () => [existingPlugin])
    const app: VinxiAppLike = {
      config: {
        routers: [
          {plugins: previousPlugins, type: 'client'},
          {name: 'client'},
          {name: 'server', type: 'server'},
        ],
      },
      hooks: {hook},
    }

    const result = installSwBuildHooks(app, {root: tmpDir})
    const typeClientPlugins = await app.config.routers[0]?.plugins?.('argument')
    const namedClientPlugins = await app.config.routers[1]?.plugins?.()

    expect(typeClientPlugins).toEqual([result.pluginOptions, existingPlugin])
    expect(namedClientPlugins).toEqual([result.pluginOptions])
    expect(previousPlugins).toHaveBeenCalledWith('argument')
    expect(app.config.routers[2]?.plugins).toBeUndefined()
    expect(hook).toHaveBeenCalledWith('app:build:nitro:assets:copy:end', result.cleanUp)
  })
})
