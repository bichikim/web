import type {CdnOptions} from './types'
import {createGetModule} from './share'
import type {Connect, Plugin} from 'vite'
import {createCdnMiddleware, MIDDLEWARE_NAME} from './middleware'

const createEmptyMap = (modules: string[]) => {
  return Object.fromEntries(modules.map((module) => [module, null]))
}

const findMiddlewareIndex = (stack: Connect.ServerStackItem[], names: string | string[]) => {
  const nameList = Array.isArray(names) ? names : [names]

  for (const name of nameList) {
    const index = stack.findIndex(
      (middleware) => typeof middleware.handle === 'function' && middleware.handle.name === name,
    )

    if (index > 0) {
      return index
    }
  }

  return -1
}

const afterMiddleware = (middlewares: Connect.Server, names: string | string[], middlewareName: string) => {
  const targetMiddlewareIndex = findMiddlewareIndex(middlewares.stack, names)

  const viteCdnMiddlewareIndex = findMiddlewareIndex(middlewares.stack, middlewareName)

  const [targetMiddlewareItem] = middlewares.stack.splice(viteCdnMiddlewareIndex, 1)

  if (targetMiddlewareItem === undefined) {
    throw new Error('vite-plugin-cdn: serveViteCdnMiddlewareItem is undefined')
  }

  middlewares.stack.splice(targetMiddlewareIndex, 0, targetMiddlewareItem)
}

export const cdnServe = (options: CdnOptions = {}): Plugin => {
  const {prefix, dev: developmentOptions = {}, sourceMap = {}} = options
  const {overrideHeaders} = developmentOptions

  const getModule = createGetModule()

  return {
    apply: 'serve',
    // buildStart() {

    // },
    configureServer({middlewares}) {
      middlewares.use(createCdnMiddleware(getModule, overrideHeaders, sourceMap, prefix))
      afterMiddleware(middlewares, ['viteServePublicMiddleware', 'viteTransformMiddleware'], MIDDLEWARE_NAME)
    },
    name: 'vite-plugin-cdn:serve',
  }
}
