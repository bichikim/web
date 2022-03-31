import {
  App,
  ComponentPropsOptions,
  ExtractPropTypes,
  getCurrentInstance,
  inject,
  onScopeDispose,
  provide,
  reactive,
  Ref,
  UnwrapNestedRefs,
  watch,
} from 'vue-demi'
import {STORE_CONTEXT, STORE_LOCAL_CONTEXT, STORE_TREE_KEY} from './symbols'

export * from './dev-tool'

export interface SetupContext<Root> {
  readonly root: UnwrapNestedRefs<Root>
}

export type Setup<T extends Record<string, any>,
  P extends Record<string, any>,
  Root extends Record<string, any> = Record<string, any>> = (
  props: UnwrapNestedRefs<P>,
  context: SetupContext<Root>,
) => T

export interface CreateStoreOptions<T extends Record<string, any>,
  P extends ComponentPropsOptions = ComponentPropsOptions,
  > {
  /**
   * @experimental
   */
  local?: boolean
  name: string
  props?: P
  setup: Setup<T, Readonly<ExtractPropTypes<P>>>
}

export type StoreManager = Readonly<{
  get(name: string): any
  remove(name: string): void
  set(
    name: string,
    item: StoreManagerItem,
  ): void
  readonly storeTree: UnwrapNestedRefs<Record<string, any>>
}>

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
  return {
    get,
    remove,
    set,
    storeTree,
  }
}

export const createVare = () => {
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

export const provideStoreManager = (manager?: StoreManager, localManager?: StoreManager) => {
  // eslint-disable-next-line functional/no-expression-statement
  provide(STORE_CONTEXT, manager ?? createManager())
  if (process.env.NODE_ENV !== 'production') {
    provide(STORE_LOCAL_CONTEXT, localManager)
  }
}

const useStoreManager = () => {
  return inject(STORE_CONTEXT) ?? createManager()
}

const useLocalManager = () => {
  return inject(STORE_LOCAL_CONTEXT)
}

const getOptions = <T extends Record<string, any>,
  P extends ComponentPropsOptions = ComponentPropsOptions,
  >(
    arg1: string | CreateStoreOptions<T, P>,
    arg2?: Setup<T, Readonly<ExtractPropTypes<P>>>,
  ): CreateStoreOptions<T, P> => {
  if (typeof arg1 === 'string' && typeof arg2 !== 'undefined') {
    return {
      name: arg1,
      setup: arg2,
    }
  }
  if (typeof arg1 === 'object' && typeof arg2 === 'undefined') {
    return arg1
  }
  // eslint-disable-next-line functional/no-throw-statement
  throw new Error('params error')
}

export type Store<T> = UnwrapNestedRefs<T> & {
  readonly __store?: never
}

const createUUid = () => {
  let count = 0
  return () => {
    count += 1
    return count
  }
}

const getUuid = createUUid()

export type ObjectWithRef<T extends Record<string, any>> = {
  [P in keyof T]: Ref<T[P]> | T[P]
}

export type UseStore<T, P> = (props?: ObjectWithRef<P>) => Store<T>

// eslint-disable-next-line @typescript-eslint/ban-types
export type EmptyObject = {}

const getTypeName = (value: any) => {
  switch (value) {
    case String:
      return 'string'
    case Number:
      return 'number'
    case Object:
      return 'object'
    case Boolean:
      return 'boolean'
    default:
      return 'any'
  }
}

export const propsValidator = (props: Record<string, any>, propsOptions?: ComponentPropsOptions): boolean | string => {
  if (!propsOptions) {
    return true
  }
  return Object.entries(props).every(([key, value]) => {
    const option = propsOptions[key]
    if (!option) {
      return true
    }
    const {validator, type} = option
    if (typeof validator === 'function') {
      return validator(value)
    }
    if (type) {
      const typeName = getTypeName(type)
      if (typeName === 'any') {
        return true
      }
      return typeof value === typeName
    }
    return true
  })
}

export interface UseStoreOptions {
  /**
   * reset saved store
   */
  reset?: boolean
}

export function createStore<T extends Record<string, any>,
  P extends ComponentPropsOptions = ComponentPropsOptions,
  >(options: CreateStoreOptions<T, P>): UseStore<T, Readonly<ExtractPropTypes<P>>>
export function createStore<T extends Record<string, any>,
  >(name: string, setup: Setup<T, EmptyObject>): UseStore<T, EmptyObject>
export function createStore<T extends Record<string, any>,
  P extends Record<string, any> = EmptyObject,
  >(
  arg1: string | CreateStoreOptions<T, P>, arg2?: Setup<T, Readonly<ExtractPropTypes<P>>>,
) {
  const {
    name,
    setup,
    local,
    props: propsOptions,
  } = getOptions<T, P>(arg1, arg2)

  // eslint-disable-next-line max-statements
  return (props?: UnwrapNestedRefs<P>, options: UseStoreOptions = {}): T => {
    const {reset} = options
    // running props validator
    if (process.env.NODE_ENV !== 'production') {
      const result = propsValidator(props ?? {}, propsOptions)
      if (result !== true) {
        console.warn(result)
      }
    }

    const storeManager = useStoreManager()
    const runSetup = <T extends Record<string, any>>(): StoreManagerItem<T> => {
      const _props = reactive(props ?? {} as P)
      return {
        props: _props,
        store: reactive(setup(
          // props
          _props,
          // setup context
          {
            root: storeManager?.storeTree,
          },
        )) as any,
      }
    }

    // skip save tree for local state Store
    if (local) {
      const instance = getCurrentInstance()
      const uid = instance ? instance.uid : getUuid()
      const componentName = (instance as any)?.ctx?.$options?.name ?? 'Undefined Name'
      const uuidName = process.env.NODE_ENV === 'production' ? `${uid}` : JSON.stringify({
        componentName,
        name,
        uid,
      })
      const localStoreManager = useLocalManager()
      const storeInfo: StoreManagerItem<T> = runSetup()
      if (localStoreManager) {
        localStoreManager.set(uuidName, storeInfo)
      }

      // remove local state Store for global dev tool watching
      onScopeDispose(() => {
        localStoreManager?.remove(uuidName)
      })

      return storeInfo.store
    }
    const savedState: StoreManagerItem | undefined = storeManager.get(name)
    // const innerState: StoreManagerItem = runSetup()
    if (savedState) {
      const savedProps = savedState.props
      const currentProps = reactive(props ?? {})
      watch(currentProps, (props) => {
        Object.keys(props).forEach((key) => {
          savedProps[key] = currentProps[key]
        })
      })
    }

    const state = (!reset && savedState?.store) ? savedState : runSetup()
    storeManager.set(name, state)
    return state.store as any
  }
}

export function defineStore<T extends Record<string, any>,
  P extends ComponentPropsOptions = ComponentPropsOptions,
  >(options: CreateStoreOptions<T, P>): UseStore<T, Readonly<ExtractPropTypes<P>>>
export function defineStore<T extends Record<string, any>,
  >(name: string, setup: Setup<T, EmptyObject>): UseStore<T, EmptyObject>
export function defineStore(
  arg1: any, arg2?: any,
) {
  return createStore(arg1, arg2)
}

/**
 * @deprecated
 * @param options
 */
export function useStore<T extends Record<string, any>,
  P extends Record<string, any>,
  >(options: CreateStoreOptions<T, P>)
export function useStore<T extends Record<string, any>,
  P extends Record<string, any>,
  >(name: string, setup: Setup<T, P>)
export function useStore(arg1: any, arg2?: any) {
  return createStore(arg1, arg2)()
}
