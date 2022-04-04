import {App, ComponentPropsOptions, Plugin, Ref, UnwrapNestedRefs, provide} from 'vue-demi'
import {createManager, StoreManager} from './manager'
import {STORE_CONTEXT, STORE_LOCAL_CONTEXT} from './symbols'

export * from './dev-tool'
export * from './manager'
export * from './symbols'
export * from './store'

export interface Vare {
  install: Plugin
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
  return {
    install: (app: App) => {
      app.provide(STORE_CONTEXT, manager)
      app.provide(STORE_LOCAL_CONTEXT, localManager)
    },
    localManager,
    manager,
  }
}

export const createVareStore = createVare

export const provideStoreManager = (manager?: StoreManager, localManager?: StoreManager): void => {
  // eslint-disable-next-line functional/no-expression-statement
  provide(STORE_CONTEXT, manager ?? createManager())
  if (process.env.NODE_ENV !== 'production') {
    provide(STORE_LOCAL_CONTEXT, localManager)
  }
}

