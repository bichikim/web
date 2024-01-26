import {freeze} from '@winter-love/utils'
import {computed, ComputedRef, inject, reactive, UnwrapNestedRefs} from 'vue'
import {STORE_CONTEXT} from './symbols'
import {cloneState} from './clone-state'

export interface StoreManagerItem<T extends Record<string, any> = Record<string, any>> {
  readonly state: UnwrapNestedRefs<T>
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

export interface StoreManager {
  get(name: string): any
  readonly initState: Readonly<Record<string, any>>
  remove(name: string): void
  set(name: string, item: StoreManagerItem): void
  readonly setInitState: (state?: Record<string, any>) => void
  readonly state: ComputedRef<Record<string, any>>
  readonly store: ManagerData
}

export interface ManagerData {
  readonly info?: StoreTreeInfo
  readonly tree: UnwrapNestedRefs<StoreTree>
}

const {assign} = Object

export type Plugin = (
  state: ComputedRef<Record<string, any>>,
  info?: StoreTreeInfo,
) => unknown

export const createManager = (info?: StoreTreeInfo): StoreManager => {
  const storeTree: UnwrapNestedRefs<StoreTree> = reactive({})
  const stateTree: UnwrapNestedRefs<StoreTree> = reactive({})
  const state = computed(() => stateTree)
  const _info = freeze(info)
  const store: ManagerData = freeze({
    info: _info,
    tree: storeTree,
  })
  const initState: Record<string, any> = {}

  const storePropsMap = new Map<string, UnwrapNestedRefs<Record<string, any>>>()
  const set = (name: string, item: StoreManagerItem) => {
    storeTree[name] = item.state
    stateTree[name] = cloneState(item.state)
  }
  const remove = (name: string) => {
    storeTree[name] = undefined
    storePropsMap.delete(name)
  }
  const get = (name: string): StoreManagerItem | undefined => {
    const state = storeTree[name]
    if (!state) {
      return
    }
    return {
      state,
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
