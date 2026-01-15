import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import {describe, expect, it} from 'vitest'
import {generateSW} from '../index'

describe('service worker e2e', () => {
  it('registers lifecycle handlers and precaches assets', async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sw-e2e-'))
    const assetsRoot = path.join(tmpDir, 'assets')
    const templatePath = path.join(tmpDir, 'sw.mjs')

    await fs.promises.mkdir(assetsRoot, {recursive: true})
    await fs.promises.writeFile(path.join(assetsRoot, 'file.txt'), '')

    const template = [
      "const CACHE_NAME = typeof __CACHE_NAME__ === 'undefined' ? 'coong-cache-v1' : __CACHE_NAME__",
      "const CACHE_VERSION = typeof __CACHE_VERSION__ === 'undefined' ? 1 : __CACHE_VERSION__",
      "const ENV = typeof __SW_ENV__ === 'undefined' ? 'production' : __SW_ENV__",
      'const SW_CONFIG = typeof __SW_CONFIG__ === \"undefined\" ? {} : __SW_CONFIG__',
      'const APP_FILES = __inject_code__',
      "self.addEventListener('install', (event) => {",
      '  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)))',
      '})',
      "self.addEventListener('activate', () => {})",
    ].join('\n')

    await fs.promises.writeFile(templatePath, template)

    try {
      await generateSW('sw.js', {
        assets: '**/*',
        assetsRoot: 'assets',
        cacheName: 'test-cache',
        cacheMaxEntries: 50,
        swTemplatePath: templatePath,
        cwd: tmpDir,
      })

      const swCode = await fs.promises.readFile(path.join(tmpDir, 'sw.js'), 'utf8')

      const listeners: Map<string, (event: any) => void> = new Map()
      const cacheStorage = new Map<string, Map<string, Response>>()

      const caches = {
        open: async (name: string) => {
          const store = cacheStorage.get(name) ?? new Map<string, Response>()
          cacheStorage.set(name, store)
          return {
            addAll: async (requests: string[]) => {
              for (const request of requests) {
                store.set(request, new Response('ok'))
              }
            },
            match: async (request: Request) => store.get(request.url),
            put: async (request: Request, response: Response) => {
              store.set(request.url, response)
            },
            // eslint-disable-next-line unicorn/prefer-spread
            keys: async () => Array.from(store.keys()).map((url) => new Request(url)),
          }
        },
        // eslint-disable-next-line unicorn/prefer-spread
        keys: async () => Array.from(cacheStorage.keys()),
        delete: async (name: string) => cacheStorage.delete(name),
        match: async (request: Request) => {
          // eslint-disable-next-line unicorn/prefer-spread
          for (const store of Array.from(cacheStorage.values())) {
            const response = store.get(request.url)
            if (response) {
              return response
            }
          }
          return undefined
        },
      }

      const clients = {
        matchAll: async () => [],
        claim: async () => undefined,
      }

      const self = {
        location: {origin: 'https://example.com'},
        clients,
        addEventListener: (type: string, handler: (event: any) => void) => {
          listeners.set(type, handler)
        },
        skipWaiting: () => undefined,
      }

      const context = {
        self,
        caches,
        fetch: async () => new Response('ok'),
        Response,
        Request,
        Headers,
        URL,
        console,
      }

      vm.runInNewContext(swCode, context)

      const installHandler = listeners.get('install')
      expect(installHandler).toBeDefined()

      let installPromise: Promise<void> | undefined
      installHandler?.({
        waitUntil: (promise: Promise<void>) => {
          installPromise = promise
        },
      })

      if (installPromise) {
        await installPromise
      }

      expect(cacheStorage.size).toBeGreaterThan(0)
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })
})
