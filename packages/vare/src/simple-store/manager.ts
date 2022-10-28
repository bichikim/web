import {inject, InjectionKey, reactive, UnwrapNestedRefs} from 'vue'

export interface StoreManager {
  get(key: string | symbol): undefined | Record<string, any>
  set(key: string | symbol, data: Record<string, any>): any
  readonly store: UnwrapNestedRefs<any>
}

export const createManager = (): StoreManager => {
  const store = reactive({})
  const get = (key: string): undefined | Record<string, any> => {
    return store[key]
  }
  const set = (key: string, data: Record<string, any>) => {
    store[key] = data
  }
  return {
    get,
    set,
    store,
  }
}

export const managerKey: InjectionKey<StoreManager> = '__manager_key__' as any

export const useManager = () => {
  return inject(managerKey)
}
