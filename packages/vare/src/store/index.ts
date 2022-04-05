import {App, markRaw, provide} from 'vue-demi'
import {createManager, Plugin, StoreManager} from './manager'
import {STORE_CONTEXT, STORE_LOCAL_CONTEXT} from './symbols'

export * from './dev-tool'
export * from './manager'
export * from './symbols'
export * from './store'

export interface PluginOptions {
  initState?: Record<string, any>
  plugins?: Plugin[]
}

export interface Vare {
  install: (app: App, options?: PluginOptions) => void
  localManager: StoreManager
  manager: StoreManager
}

export const createVare = (): Vare => {
  const manager = createManager({
    kind: 'state',
  })
  const localManager = createManager({
    kind: 'local-state',
  })
  return markRaw({
    install: (app: App, options: PluginOptions = {}) => {
      const {plugins = [], initState} = options
      manager.setInitState(initState)
      plugins.forEach((plugin) => {
        plugin(manager.state, manager.store.info)
      })
      app.provide(STORE_CONTEXT, manager)
      app.provide(STORE_LOCAL_CONTEXT, localManager)
    },
    localManager,
    manager,
    state: manager.state,
  })
}

export const createVareStore = createVare

export const provideStoreManager = (manager?: StoreManager, localManager?: StoreManager): void => {
  // eslint-disable-next-line functional/no-expression-statement
  provide(STORE_CONTEXT, manager ?? createManager())
  if (process.env.NODE_ENV !== 'production') {
    provide(STORE_LOCAL_CONTEXT, localManager)
  }
}

