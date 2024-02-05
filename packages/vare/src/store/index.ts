import {UseStore} from 'src/store/store'
import {App, ComputedRef, markRaw, provide} from 'vue'
import {createManager, Plugin, StoreManager} from './manager'
import {STORE_CONTEXT, STORE_LOCAL_CONTEXT} from './symbols'

export * from './dev-tool'
export * from './manager'
export * from './store'
export * from './symbols'

export interface PluginOptions {
  /**
   * keep state
   */
  global?: UseStore<any>[]
  /**
   * pass initState
   * @example
   * const initState = {foo: {name: 'foo'}}
   *
   * const useFoo = defineStore('foo', (initState) => {
   *   const name = ref(initState.name ?? 'defaultFoo')
   *   return {
   *     name
   *   }
   * }
   */
  initState?: Record<string, any>
  /**
   * plugins called only once
   * const vare = createVare()
   * app.use(vare, {
   *   plugins: [
   *     (state) => {
   *       watch(state, (value) => {
   *         // save data
   *         localhost.setItem('my-item', JSON.stringify(value))
   *       })
   *     }
   *   ]
   * })
   */
  plugins?: Plugin[]
}

export interface Vare {
  install(app: App, options?: PluginOptions): void
  readonly localManager: StoreManager
  readonly manager: StoreManager
  readonly state: ComputedRef<any>
}

const applyGlobalStore = (manager: StoreManager, global?: UseStore<any>[]) => {
  if (!global) {
    return
  }
  global.forEach((useX) => {
    useX({
      manager,
    })
  })
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
      const {plugins = [], initState, global} = options
      manager.setInitState(initState)
      plugins.forEach((plugin) => {
        plugin(manager.state, manager.store.info)
      })
      app.provide(STORE_CONTEXT, manager)
      app.provide(STORE_LOCAL_CONTEXT, localManager)
      applyGlobalStore(manager, global)
    },
    localManager,
    manager,
    state: manager.state,
  })
}

export const createVareStore = createVare

export const provideStoreManager = (
  manager?: StoreManager,
  localManager?: StoreManager,
): void => {
  provide(STORE_CONTEXT, manager ?? createManager())
  if (process.env.NODE_ENV !== 'production') {
    provide(STORE_LOCAL_CONTEXT, localManager)
  }
}
