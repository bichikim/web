import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {getInstallFiles} from '../get-install-files'
import {generateSW} from '../index'

vi.mock('../get-install-files', () => ({getInstallFiles: vi.fn()}))

const TEMPLATE = [
  'const CACHE_NAME = __CACHE_NAME__',
  'const CACHE_VERSION = __CACHE_VERSION__',
  'const ENVIRONMENT = __SW_ENV__',
  'const CONFIG = __SW_CONFIG__',
  'const APP_FILES = __inject_code__',
].join('\n')

describe('generateSW failures', () => {
  let tmpDir: string
  let templatePath: string

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sw-errors-'))
    templatePath = path.join(tmpDir, 'sw.mjs')
    await fs.promises.writeFile(templatePath, TEMPLATE)
    vi.mocked(getInstallFiles).mockResolvedValue(['/app.js'])
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await fs.promises.rm(tmpDir, {force: true, recursive: true})
  })

  it('should report a missing service worker template', async () => {
    await expect(
      generateSW('sw.js', {
        assets: '**/*',
        assetsRoot: 'assets',
        cwd: tmpDir,
        swTemplatePath: path.join(tmpDir, 'missing.mjs'),
      }),
    ).rejects.toThrow('Failed to read service worker template')
  })

  it('should resolve the bundled template when no custom path is configured', async () => {
    const readFile = vi.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(TEMPLATE)

    await generateSW('sw.js', {
      assets: '**/*',
      assetsRoot: 'assets',
      cwd: tmpDir,
    })

    expect(readFile).toHaveBeenCalledWith(expect.stringMatching(/sw\.mjs$/u), 'utf8')
  })

  it('should stringify a non-error template read failure', async () => {
    vi.spyOn(fs.promises, 'readFile').mockRejectedValueOnce('permission denied')

    await expect(
      generateSW('sw.js', {
        assets: '**/*',
        assetsRoot: 'assets',
        cwd: tmpDir,
        swTemplatePath: templatePath,
      }),
    ).rejects.toThrow('permission denied')
  })

  it('should report asset collection failures', async () => {
    vi.mocked(getInstallFiles).mockRejectedValueOnce(new Error('glob failed'))

    await expect(
      generateSW('sw.js', {
        assets: '**/*',
        assetsRoot: 'assets',
        cwd: tmpDir,
        swTemplatePath: templatePath,
      }),
    ).rejects.toThrow('Failed to get install files from **/* in assets: glob failed')
  })

  it('should stringify a non-error asset collection failure', async () => {
    vi.mocked(getInstallFiles).mockRejectedValueOnce('glob failed')

    await expect(
      generateSW('sw.js', {
        assets: '**/*',
        assetsRoot: 'assets',
        cwd: tmpDir,
        swTemplatePath: templatePath,
      }),
    ).rejects.toThrow('Failed to get install files from **/* in assets: glob failed')
  })

  it('should reject an invalid install file result', async () => {
    vi.mocked(getInstallFiles).mockResolvedValueOnce('not-an-array' as never)

    await expect(
      generateSW('sw.js', {
        assets: '**/*',
        assetsRoot: 'assets',
        cwd: tmpDir,
        swTemplatePath: templatePath,
      }),
    ).rejects.toThrow('Service worker generation failed: Invalid install files')
  })

  it('should reject a template without the injection target', async () => {
    await fs.promises.writeFile(templatePath, 'const untouched = true')

    await expect(
      generateSW('sw.js', {
        assets: '**/*',
        assetsRoot: 'assets',
        cwd: tmpDir,
        swTemplatePath: templatePath,
      }),
    ).rejects.toThrow('Template missing required token: __inject_code__')
  })

  it('should report output write failures', async () => {
    vi.spyOn(fs.promises, 'writeFile').mockRejectedValueOnce(new Error('read only'))

    await expect(
      generateSW('sw.js', {
        assets: '**/*',
        assetsRoot: 'assets',
        cwd: tmpDir,
        swTemplatePath: templatePath,
      }),
    ).rejects.toThrow(`Failed to write service worker to ${path.join(tmpDir, 'sw.js')}: read only`)
  })

  it('should stringify a non-error output write failure', async () => {
    vi.spyOn(fs.promises, 'writeFile').mockRejectedValueOnce('read only')

    await expect(
      generateSW('sw.js', {
        assets: '**/*',
        assetsRoot: 'assets',
        cwd: tmpDir,
        swTemplatePath: templatePath,
      }),
    ).rejects.toThrow(`Failed to write service worker to ${path.join(tmpDir, 'sw.js')}: read only`)
  })

  it('should wrap a non-error generation failure', async () => {
    vi.spyOn(path, 'join').mockImplementationOnce(() => {
      // Dependencies can throw non-Error values despite their TypeScript contracts.
      // oxlint-disable-next-line eslint/no-throw-literal
      throw 'invalid path'
    })

    await expect(
      generateSW('sw.js', {
        assets: '**/*',
        assetsRoot: 'assets',
        cwd: tmpDir,
        swTemplatePath: templatePath,
      }),
    ).rejects.toThrow('Service worker generation failed: invalid path')
  })

  it('should preserve optional template tokens when no overrides are configured', async () => {
    await generateSW('sw.js', {
      assets: '**/*',
      assetsRoot: 'assets',
      cachePriorities: {},
      cacheStrategies: {},
      cwd: tmpDir,
      env: 'test' as never,
      swTemplatePath: templatePath,
    })

    const output = await fs.promises.readFile(path.join(tmpDir, 'sw.js'), 'utf8')

    expect(output).toContain('__CACHE_NAME__')
    expect(output).toContain('__CACHE_VERSION__')
    expect(output).toContain('__SW_CONFIG__')
    expect(output).toContain('"production"')
    expect(output).toContain('["/app.js"]')
  })
})
