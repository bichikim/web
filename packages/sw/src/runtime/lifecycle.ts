import type {Logger} from './types'

export interface LifecycleOptions {
  appFiles: string[]
  cacheMetadataName: string
  cacheName: string
  cacheNamePrefix: string
  cacheVersion: number
  log: Logger
  notifyClients: (message: Record<string, unknown>) => Promise<void>
}

const isOwnedCacheName = (name: string, options: LifecycleOptions) => {
  if (name === options.cacheName || name === options.cacheMetadataName) {
    return true
  }

  return (
    options.cacheNamePrefix !== options.cacheName && name.startsWith(`${options.cacheNamePrefix}-v`)
  )
}

export const registerLifecycleHandlers = (options: LifecycleOptions): void => {
  const clearCaches = async () => {
    const cacheNames = await caches.keys()

    await Promise.all(
      cacheNames
        .filter((name) => isOwnedCacheName(name, options))
        .map((name) => caches.delete(name)),
    )
  }

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(options.cacheName).then((cache) => {
        options.log('info', 'Installing cache', {
          files: options.appFiles.length,
          version: options.cacheVersion,
        })

        return cache.addAll(options.appFiles)
      }),
    )
  })

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames
              .filter(
                (cacheName) =>
                  cacheName !== options.cacheName &&
                  cacheName !== options.cacheMetadataName &&
                  isOwnedCacheName(cacheName, options),
              )
              .map((cacheName) => {
                options.log('info', 'Deleting old cache', {cacheName})

                return caches.delete(cacheName)
              }),
          )
        })
        .then(async () => {
          await self.clients.claim()
          await options.notifyClients({type: 'SW_ACTIVATED', version: options.cacheVersion})
        }),
    )
  })

  self.addEventListener('message', (event: ExtendableMessageEvent) => {
    if (!event.data) {
      return
    }

    if (event.data.type === 'SKIP_WAITING') {
      options.log('info', 'Received skip waiting message')
      self.skipWaiting()

      return
    }

    if (event.data.type === 'CLEAR_CACHE') {
      event.waitUntil(clearCaches())
    }
  })
}
