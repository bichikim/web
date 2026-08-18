/** @vitest-environment node */

import fs from 'node:fs'
import {createRequire} from 'node:module'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import {build} from 'vite'
import {afterEach, describe, expect, it} from 'vitest'

const temporaryDirectories: string[] = []

type BuildListener = (event: unknown) => void

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.promises.rm(directory, {
        force: true,
        recursive: true,
      }),
    ),
  )
})

describe('service worker build output', () => {
  it('should produce a standalone executable service worker bundle', async () => {
    const packageRoot = path.join(import.meta.dirname, '..', '..')
    const outputDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sw-bundle-'))
    const outputPath = path.join(outputDirectory, 'sw.mjs')
    const require = createRequire(import.meta.url)

    temporaryDirectories.push(outputDirectory)

    await build({
      build: {emptyOutDir: true, outDir: outputDirectory},
      logLevel: 'silent',
      root: packageRoot,
    })

    const source = await fs.promises.readFile(outputPath, 'utf8')
    const listeners = new Map<string, BuildListener>()
    const executableSource = source.replaceAll('__inject_code__', '[]')

    expect(source).not.toMatch(/^\s*import\s|\bfrom\s+['"]\.\//mu)
    expect(() =>
      vm.runInNewContext(executableSource, {
        caches: {},
        console,
        fetch: async () => new Response(),
        Headers,
        Request,
        Response,
        self: {
          addEventListener: (type: string, listener: BuildListener) => {
            listeners.set(type, listener)
          },
          clients: {
            claim: async () => undefined,
            matchAll: async () => [],
          },
          location: {origin: 'https://example.com'},
          skipWaiting: async () => undefined,
        },
        URL,
      }),
    ).not.toThrow()
    expect(Array.from(listeners.keys()).sort()).toEqual(['activate', 'fetch', 'install', 'message'])
    expect(() => require(path.join(outputDirectory, 'index.js'))).not.toThrow()
  })
})
