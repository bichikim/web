import type {StrategyHandlers} from './strategies'
import type {CacheDestination, CacheStrategyConfig, ServiceWorkerFetchEvent} from './types'

export interface RoutingOptions {
  origin: string
  strategies: CacheStrategyConfig
  strategyHandlers: StrategyHandlers
}

const normalizeDestination = (destination: RequestDestination | ''): CacheDestination =>
  destination || 'default'

const resolveStrategy = (strategies: CacheStrategyConfig, destination: CacheDestination) =>
  strategies[destination] ?? strategies.default ?? 'cache-first'

export const registerFetchHandler = (options: RoutingOptions): void => {
  const apiPath = `${options.origin}/api/`

  self.addEventListener('fetch', (event: ServiceWorkerFetchEvent) => {
    const {method, url} = event.request

    if (method !== 'GET') {
      return
    }

    const requestUrl = new URL(url)

    if (
      requestUrl.origin !== options.origin ||
      url.startsWith(apiPath) ||
      requestUrl.pathname.startsWith('/instruments/') ||
      requestUrl.pathname.startsWith('/_vercel/')
    ) {
      return
    }

    const destination = normalizeDestination(event.request.destination)
    const strategy = resolveStrategy(options.strategies, destination)

    if (strategy === 'network-only') {
      event.respondWith(options.strategyHandlers['network-only'](event))

      return
    }

    event.respondWith(options.strategyHandlers[strategy](event, destination))
  })
}
