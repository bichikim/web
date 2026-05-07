import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import {describe, expect, it} from 'vitest'
import {generateSW} from '../index'

const compileServiceWorkerTemplate = async (appFiles: string[] = ['/file.txt']) => {
  const swSource = await fs.promises.readFile(path.join(import.meta.dirname, '..', 'sw.ts'), 'utf8')
  const {outputText} = ts.transpileModule(swSource, {
    compilerOptions: {
      module: ts.ModuleKind.None,
      target: ts.ScriptTarget.ES2022,
    },
  })

  return outputText.replaceAll('__inject_code__', JSON.stringify(appFiles))
}

const createServiceWorkerContext = (
  fetchHandler: (request: any, init?: RequestInit) => Promise<Response>,
) => {
  const listeners: Map<string, (event: any) => void> = new Map()
  const cacheStorage = new Map<string, Map<string, Response>>()
  const requestUrl = (request: Request | string | {url: string}) => {
    if (typeof request === 'string') {
      return request
    }

    return request.url
  }

  const caches = {
    delete: async (name: string) => cacheStorage.delete(name),
    keys: async () => Array.from(cacheStorage.keys()),
    match: async (request: Request | string | {url: string}) => {
      const url = requestUrl(request)

      for (const store of cacheStorage.values()) {
        const response = store.get(url)

        if (response) {
          return response
        }
      }

      return undefined
    },
    open: async (name: string) => {
      const store = cacheStorage.get(name) ?? new Map<string, Response>()
      cacheStorage.set(name, store)

      return {
        addAll: async (requests: string[]) => {
          for (const request of requests) {
            store.set(new URL(request, 'https://example.com').toString(), new Response('ok'))
          }
        },
        delete: async (request: Request | string | {url: string}) =>
          store.delete(requestUrl(request)),
        keys: async () => Array.from(store.keys()).map((url) => new Request(url)),
        match: async (request: Request | string | {url: string}) => store.get(requestUrl(request)),
        put: async (request: Request | string | {url: string}, response: Response) => {
          store.set(requestUrl(request), response)
        },
      }
    },
  }

  const clients = {
    claim: async () => undefined,
    matchAll: async () => [],
  }

  const self = {
    addEventListener: (type: string, handler: (event: any) => void) => {
      listeners.set(type, handler)
    },
    clients,
    location: {origin: 'https://example.com'},
    skipWaiting: () => undefined,
  }

  const context = {
    caches,
    console,
    fetch: fetchHandler,
    Headers,
    Request,
    Response,
    self,
    URL,
  }

  return {cacheStorage, context, listeners}
}

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
      'const SW_CONFIG = typeof __SW_CONFIG__ === "undefined" ? {} : __SW_CONFIG__',
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
        cacheMaxEntries: 50,
        cacheName: 'test-cache',
        cwd: tmpDir,
        swTemplatePath: templatePath,
      })

      const swCode = await fs.promises.readFile(path.join(tmpDir, 'sw.js'), 'utf8')

      const listeners: Map<string, (event: any) => void> = new Map()
      const cacheStorage = new Map<string, Map<string, Response>>()

      const caches = {
        delete: async (name: string) => cacheStorage.delete(name),
        // eslint-disable-next-line unicorn/prefer-spread
        keys: async () => Array.from(cacheStorage.keys()),
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
        open: async (name: string) => {
          const store = cacheStorage.get(name) ?? new Map<string, Response>()
          cacheStorage.set(name, store)
          return {
            addAll: async (requests: string[]) => {
              for (const request of requests) {
                store.set(request, new Response('ok'))
              }
            },
            keys: async () => Array.from(store.keys()).map((url) => new Request(url)),
            match: async (request: Request) => store.get(request.url),
            // eslint-disable-next-line unicorn/prefer-spread
            put: async (request: Request, response: Response) => {
              store.set(request.url, response)
            },
          }
        },
      }

      const clients = {
        claim: async () => undefined,
        matchAll: async () => [],
      }

      const self = {
        addEventListener: (type: string, handler: (event: any) => void) => {
          listeners.set(type, handler)
        },
        clients,
        location: {origin: 'https://example.com'},
        skipWaiting: () => undefined,
      }

      const context = {
        caches,
        console,
        fetch: async () => new Response('ok'),
        Headers,
        Request,
        Response,
        self,
        URL,
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

  it('runs generated template without optional globals', async () => {
    const swCode = await compileServiceWorkerTemplate()
    const {cacheStorage, context, listeners} = createServiceWorkerContext(
      async () => new Response('ok'),
    )

    expect(() => vm.runInNewContext(swCode, context)).not.toThrow()

    const installHandler = listeners.get('install')
    let installPromise: Promise<void> | undefined

    installHandler?.({
      waitUntil: (promise: Promise<void>) => {
        installPromise = promise
      },
    })

    await installPromise

    expect(cacheStorage.get('coong-cache-v1')?.has('https://example.com/file.txt')).toBe(true)
  })

  it('keeps stale-while-revalidate refresh alive and avoids caching failed responses', async () => {
    const swCode = await compileServiceWorkerTemplate()
    const fetchCalls: Array<{init?: RequestInit; request: any}> = []
    const {cacheStorage, context, listeners} = createServiceWorkerContext(async (request, init) => {
      fetchCalls.push({init, request})

      return new Response('server error', {status: 500})
    })

    vm.runInNewContext(swCode, context)

    const appCache = new Map<string, Response>()
    appCache.set('https://example.com/image.png', new Response('cached image'))
    cacheStorage.set('coong-cache-v1', appCache)

    const fetchHandler = listeners.get('fetch')
    const request = {
      destination: 'image',
      headers: new Headers({accept: 'image/png'}),
      method: 'GET',
      url: 'https://example.com/image.png',
    }
    let responsePromise: Promise<Response> | undefined
    let refreshPromise: Promise<void> | undefined

    fetchHandler?.({
      request,
      respondWith: (promise: Promise<Response>) => {
        responsePromise = promise
      },
      waitUntil: (promise: Promise<void>) => {
        refreshPromise = promise
      },
    })

    await expect(responsePromise).resolves.toHaveProperty('status', 200)
    await refreshPromise

    expect(fetchCalls).toHaveLength(1)
    expect(appCache.get('https://example.com/image.png')?.status).toBe(200)
  })
})
