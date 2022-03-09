import {App, inject, InjectionKey, provide, reactive, UnwrapNestedRefs} from 'vue'

export * from './dev-tool'

export type Setup<
  T,
  Root extends Record<string, any> = Record<string, any>
  > = (root: UnwrapNestedRefs<Root>) => T

export interface CreateStoreOptions<T> {
  name: string
  setup: Setup<T>
  useWithReset?: boolean
}

export class StoreManager {
  storeTree: UnwrapNestedRefs<Record<string, any>> = reactive({})

  add(name: string, store: UnwrapNestedRefs<Record<string, any>>) {
    this.storeTree[name] = store
  }

  remove(name: string) {
    this.storeTree[name] = undefined
  }

  get(name: string) {
    return this.storeTree[name]
  }
}

export const STORE_CONTEXT: InjectionKey<StoreManager> = Symbol('store')

export const createVareStore = () => {
  const manager = new StoreManager()
  return {
    install: (app: App) => {
      app.provide(STORE_CONTEXT, manager)
    },
    manager,
  }
}

export const provideStoreManager = (manager?: StoreManager) => {
  provide(STORE_CONTEXT, manager ?? new StoreManager())
}

const useStoreManager = () => {
  return inject(STORE_CONTEXT) ?? new StoreManager()
}

const getOptions = <T>(arg1: string | CreateStoreOptions<T>, arg2?: Setup<T>): CreateStoreOptions<T> => {
  if (typeof arg1 === 'string' && typeof arg2 !== 'undefined') {
    return {
      name: arg1,
      setup: arg2,
    }
  }
  if (typeof arg1 === 'object' && typeof arg2 === 'undefined') {
    return arg1
  }
  throw new Error('params error')
}

export type UseStore<T> = () => UnwrapNestedRefs<T>

export function createStore<T extends Record<string, any>>(options: CreateStoreOptions<T>): UseStore<T>
export function createStore<T extends Record<string, any>>(name: string, setup: Setup<T>): UseStore<T>
export function createStore<T extends Record<string, any>>(arg1: string | CreateStoreOptions<T>, arg2?: Setup<T>) {
  const {name, setup, useWithReset = false} = getOptions<T>(arg1, arg2)

  return (): T => {
    const storeManager = useStoreManager()
    const savedState = storeManager.get(name)
    const resetStore = () => setup(storeManager?.storeTree)
    const state = (!useWithReset && savedState) ? savedState : reactive<T>(resetStore())
    storeManager.add(name, state)
    return state
  }
}

export function useStore<T>(options: CreateStoreOptions<T>)
export function useStore<T>(name: string, setup: Setup<T>)
export function useStore<T>(arg1: any, arg2?: any) {
  return createStore<T>(arg1, arg2)()
}
