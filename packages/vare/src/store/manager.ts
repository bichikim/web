import {inject, reactive, UnwrapNestedRefs} from 'vue-demi'
import {oneDepthUpdate} from './shallow-update'
import {STORE_CONTEXT, STORE_TREE_KEY} from './symbols'

export interface StoreManagerItem<T extends Record<string, any> = Record<string, any>> {
  props: UnwrapNestedRefs<Record<string, any>>
  store: UnwrapNestedRefs<T>
}

export interface StoreTreeInfo {
  kind: string
}

export interface StoreTree {
  [key: string]: any

  [STORE_TREE_KEY]?: StoreTreeInfo
}

export const useStoreManager = () => {
  return inject(STORE_CONTEXT) ?? createManager()
}

export type StoreManager = Readonly<{
  get(name: string): any
  remove(name: string): void
  set(
    name: string,
    item: StoreManagerItem,
  ): void
  readonly storeTree: UnwrapNestedRefs<Record<string, any>>
  update(source: Record<string, any>)
}>
export const createManager = (info?: StoreTreeInfo): StoreManager => {
  const storeTree: UnwrapNestedRefs<StoreTree> = reactive({
    [STORE_TREE_KEY]: info,
  })
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
  const update = (source: Record<string, any>) => {
    oneDepthUpdate(storeTree, source)
  }
  return {
    get,
    remove,
    set,
    storeTree,
    update,
  }
}
