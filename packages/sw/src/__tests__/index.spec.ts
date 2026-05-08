import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {generateSW} from '../index'

describe('generateSW', () => {
  it('writes service worker with injected config', async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sw-generate-'))
    const assetsRoot = path.join(tmpDir, 'assets')
    const templatePath = path.join(tmpDir, 'sw.mjs')

    await fs.promises.mkdir(assetsRoot, {recursive: true})
    await fs.promises.writeFile(path.join(assetsRoot, 'file.txt'), '')

    const template = [
      "const CACHE_NAME = typeof __CACHE_NAME__ === 'undefined' ? 'coong-cache-v1' : __CACHE_NAME__",
      "const CACHE_VERSION = typeof __CACHE_VERSION__ === 'undefined' ? 1 : __CACHE_VERSION__",
      "const ENV = typeof __SW_ENV__ === 'undefined' ? 'production' : __SW_ENV__",
      'const SW_CONFIG = typeof __SW_CONFIG__ === "undefined" ? {} : __SW_CONFIG__',
      'const APP_FILES = __inject_code__',
    ].join('\n')

    await fs.promises.writeFile(templatePath, template)

    try {
      await generateSW('sw.js', {
        assets: '**/*',
        assetsRoot: 'assets',
        cacheMaxEntries: 10,
        cacheName: 'test-cache',
        cacheVersion: 2,
        cwd: tmpDir,
        env: 'development',
        logLevel: 'debug',
        swTemplatePath: templatePath,
      })

      const outputPath = path.join(tmpDir, 'sw.js')
      const output = await fs.promises.readFile(outputPath, 'utf8')

      expect(output).toContain('"test-cache"')
      expect(output).toContain('2')
      expect(output).toContain('"logLevel":"debug"')
      expect(output).toContain('"cacheMaxEntries":10')
      expect(output).toContain('"development"')
      expect(output).toContain('"/file.txt"')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })
})
