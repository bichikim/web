import {
  App,
  ComponentPropsOptions,
  ExtractPropTypes,
  inject,
  InjectionKey,
  onScopeDispose,
  provide,
  reactive,
  Ref,
  UnwrapNestedRefs,
} from 'vue-demi'

export * from './dev-tool'

export type Setup<T extends Record<string, any>,
  P extends Record<string, any>,
  Root extends Record<string, any> = Record<string, any>> = (
    props: UnwrapNestedRefs<P>,
    root: UnwrapNestedRefs<Root>,
    ) => T

export interface CreateStoreOptions<T extends Record<string, any>,
  P extends ComponentPropsOptions = ComponentPropsOptions,
  > {
  local?: boolean
  name: string
  props?: P
  setup: Setup<T, Readonly<ExtractPropTypes<P>>>
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
export const STORE_LOCAL_CONTEXT: InjectionKey<StoreManager> = Symbol('store-local')

export const createVareStore = () => {
  const manager = new StoreManager()
  const localManager = new StoreManager()
  return {
    install: (app: App) => {
      app.provide(STORE_CONTEXT, manager)
      // localManager only for the devtool
      if (__DEV__) {
        app.provide(STORE_LOCAL_CONTEXT, localManager)
      }
    },
    localManager,
    manager,
  }
}

export const provideStoreManager = (manager?: StoreManager, localManager?: StoreManager) => {
  provide(STORE_CONTEXT, manager ?? new StoreManager())
  if (__DEV__) {
    provide(STORE_LOCAL_CONTEXT, localManager)
  }
}

const useStoreManager = () => {
  return inject(STORE_CONTEXT) ?? new StoreManager()
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
  throw new Error('params error')
}

export type Store<T> = UnwrapNestedRefs<T> & {
  __store?: never
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
    useWithReset = false,
    local,
    props: propsOptions,
  } = getOptions<T, P>(arg1, arg2)

  return (props?: UnwrapNestedRefs<P>): T => {
    if (__DEV__) {
      const result = propsValidator(props ?? {}, propsOptions)
      if (result !== true) {
        console.warn(result)
      }
    }
    const uuid = getUuid()
    const uuidName = `${name}-${uuid}`
    const storeManager = useStoreManager()
    const resetStore = () => setup(reactive(props ?? {} as P), storeManager?.storeTree)
    // skip save tree
    if (local) {
      const localStoreManager = useLocalManager()
      const state = resetStore()
      if (localStoreManager) {
        localStoreManager.add(uuidName, state)
      }

      onScopeDispose(() => {
        localStoreManager?.remove(uuidName)
      })

      return state
    }
    const savedState = storeManager.get(name)
    const state = (!useWithReset && savedState) ? savedState : reactive<T>(resetStore())
    storeManager.add(name, state)
    return state
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

export function useStore<T extends Record<string, any>,
  P extends Record<string, any>,
  >(options: CreateStoreOptions<T, P>)
export function useStore<T extends Record<string, any>,
  P extends Record<string, any>,
  >(name: string, setup: Setup<T, P>)
export function useStore(arg1: any, arg2?: any) {
  return createStore(arg1, arg2)()
}
