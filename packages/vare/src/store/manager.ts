import {computed, ComputedRef, inject, reactive, UnwrapNestedRefs} from 'vue-demi'
import {oneDepthUpdate} from './shallow-update'
import {STORE_CONTEXT} from './symbols'
import {freeze} from '@winter-love/utils'

export interface StoreManagerItem<T extends Record<string, any> = Record<string, any>> {
  props: UnwrapNestedRefs<Record<string, any>>
  store: UnwrapNestedRefs<T>
}

export interface StoreTreeInfo {
  readonly kind: string
}

export interface StoreTree {
  [key: string]: any
}

export const useStoreManager = () => {
  return inject(STORE_CONTEXT) ?? createManager()
}

export type StoreManager = Readonly<{
  get(name: string): any
  readonly initState: Record<string, any>
  remove(name: string): void
  set(
    name: string,
    item: StoreManagerItem,
  ): void
  setInitState: (state?: Record<string, any>) => void
  state: ComputedRef<Record<string, any>>
  readonly store: ManagerData
}>

export interface ManagerData {
  readonly info?: StoreTreeInfo
  readonly tree: UnwrapNestedRefs<StoreTree>
}

const {assign} = Object

export type Plugin = (state: ComputedRef<Record<string, any>>, info?: StoreTreeInfo) => unknown

export const createManager = (info?: StoreTreeInfo): StoreManager => {
  const storeTree: UnwrapNestedRefs<StoreTree> = reactive({})
  const state = computed(() => storeTree)
  const _info = freeze(info)
  const store: ManagerData = freeze({
    info: _info,
    tree: storeTree,
  })
  const initState: Record<string, any> = {}

  const storePropsMap = new Map<string, UnwrapNestedRefs<Record<string, any>>>()
  const set = (
    name: string,
    item: StoreManagerItem,
  ) => {
    storeTree[name] = item.store
    storePropsMap.set(name, item.props)
  }
  const remove = (name: string) => {
    storeTree[name] = undefined
    storePropsMap.delete(name)
  }
  const get = (name: string): StoreManagerItem => {
    return {
      props: storePropsMap.get(name) ?? {},
      store: storeTree[name],
    }
  }
  const setInitState = (state: Record<string, any> = {}) => {
    assign(initState, state)
  }

  return {
    get,
    initState,
    remove,
    set,
    setInitState,
    state,
    store,
  }
}
