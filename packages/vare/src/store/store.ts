import {STORE_LOCAL_CONTEXT} from './symbols'
import {StoreManager, StoreManagerItem, useStoreManager} from './manager'
import {
  ComponentPropsOptions,
  ExtractPropTypes,
  getCurrentInstance, inject,
  onScopeDispose,
  reactive, Ref,
  UnwrapNestedRefs, watch,
} from 'vue-demi'
import {freeze} from '@winter-love/utils'
import {propsValidator} from './props-validator'
import {createUuid} from './create-uuid'
const getUuid = createUuid()
// eslint-disable-next-line @typescript-eslint/ban-types
export type EmptyObject = {}

export interface UseStore<T, P> {
  (props?: ObjectWithRef<P>, options?: UseStoreOptions): Store<T>
  readonly local: (props?: ObjectWithRef<P>, options?: Omit<UseStoreOptions, 'local'>) => Store<T>
}

export type ObjectWithRef<T extends Record<string, any>> = {
  [P in keyof T]: Ref<T[P]> | T[P]
}

export type Store<T> = UnwrapNestedRefs<T> & {
  readonly __store?: never
}

export interface UseStoreOptions {
  /**
   * use as a normal composition api function
   */
  local?: boolean
  /**
   * reset saved store
   */
  reset?: boolean
}

export interface SetupContext<Root> {
  readonly initState: Record<string, any>
  readonly root: UnwrapNestedRefs<Root>
}

export type Setup<
  T extends Record<string, any>,
  P extends Record<string, any>,
  Root extends Record<string, any> = Record<string, any>> = (
  props: UnwrapNestedRefs<P>,
  context: SetupContext<Root>,
) => T
export interface CreateStoreOptions<T extends Record<string, any>,
  P extends ComponentPropsOptions = ComponentPropsOptions,
  > {
  /**
   * @experimental use at using time
   */
  local?: boolean
  name: string
  props?: P
  setup: Setup<T, Readonly<ExtractPropTypes<P>>>
}
export interface CreateSetupArgs<
  T extends Record<string, any>,
  P extends Record<string, any> = EmptyObject,
  > {
  name: string
  props?: P
  setup: Setup<T, P>
  storeManager: StoreManager
}

const createSetup = <
  T extends Record<string, any>,
  P extends Record<string, any> = EmptyObject,
  >(args: CreateSetupArgs<T, P>): StoreManagerItem<T> => {
  const {setup, props, storeManager, name} = args
  const _props = reactive(props ?? {} as P)
  const _initState = storeManager.initState
  const initState = typeof _initState[name] === 'object' ? _initState[name] : {}
  return {
    props: _props,
    store: reactive(setup(
      // props
      _props,
      // setup context
      {
        initState: freeze({...initState}),
        root: storeManager.state.value,
      },
    )),
  }
}

export interface CreateLocalStoreArgs<
  T extends Record<string, any>,
  P extends Record<string, any> = EmptyObject,
  > extends CreateSetupArgs<T, P> {
  name: string
}

const createLocalStore = <
  T extends Record<string, any>,
  P extends Record<string, any> = EmptyObject,
  >(args: CreateLocalStoreArgs<T, P>): UnwrapNestedRefs<T> => {
  const {name, storeManager, setup, props} = args
  const item: StoreManagerItem<T> = createSetup<T, P>({
    name,
    props,
    setup,
    storeManager,
  })
  const instance = getCurrentInstance()
  const uid = instance ? instance.uid : getUuid()
  const componentName = (instance as any)?.ctx?.$options?.name ?? 'Undefined Name'
  const uuidName = process.env.NODE_ENV === 'production' ? `${uid}` : JSON.stringify({
    componentName,
    name,
    uid,
  })
  const localStoreManager = useLocalManager()
  if (localStoreManager) {
    localStoreManager.set(uuidName, item)
  }

  // remove local state Store for global dev tool watching
  onScopeDispose(() => {
    localStoreManager?.remove(uuidName)
  })

  return item.store
}

export interface CreateGlobalStoreArgs<
  T extends Record<string, any>,
  P extends Record<string, any> = EmptyObject,
  > {
  name: string
  options: Omit<UseStoreOptions, 'local'>
  props?: P
  setup: Setup<T, P>
  storeManager: StoreManager
}

const createGlobalStore = <
  T extends Record<string, any>,
  P extends Record<string, any> = EmptyObject,
  >(args: CreateGlobalStoreArgs<T, P>): UnwrapNestedRefs<T> => {
  const {name, options, props, storeManager, setup} = args
  const {reset} = options
  const savedState: StoreManagerItem<T> | undefined = storeManager.get(name)
  if (savedState) {
    const savedProps = savedState.props
    const currentProps = reactive(props ?? {})
    watch(currentProps, (props) => {
      Object.keys(props).forEach((key) => {
        savedProps[key] = currentProps[key]
      })
    })
  }
  const state = (!reset && savedState?.store)
    ? savedState
    : createSetup({
      name,
      props,
      setup,
      storeManager,
    })
  storeManager.set(name, state)
  return state.store
}

export const useLocalManager = (): StoreManager | undefined => {
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

export function defineStore<T extends Record<string, any>,
  P extends ComponentPropsOptions = ComponentPropsOptions,
  >(options: CreateStoreOptions<T, P>): UseStore<T, Readonly<ExtractPropTypes<P>>>
export function defineStore<T extends Record<string, any>,
  >(name: string, setup: Setup<T, EmptyObject>): UseStore<T, EmptyObject>
export function defineStore<T extends Record<string, any>,
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
  const hook = (props?: UnwrapNestedRefs<P>, options: UseStoreOptions = {}): T => {
    const {local: innerLocal = local} = options
    // running props validator
    if (process.env.NODE_ENV !== 'production') {
      const result = propsValidator(props ?? {}, propsOptions)
      if (result !== true) {
        console.warn(result)
      }
    }

    const storeManager = useStoreManager()

    if (innerLocal) {
      return createLocalStore<T, P>({name, props, setup, storeManager})
    }
    return createGlobalStore({
      name,
      options,
      props,
      setup,
      storeManager,
    })
  }
  return freeze(Object.assign(hook, {
    local: (props?: UnwrapNestedRefs<P>, options: Omit<UseStoreOptions, 'local'> = {}) =>
      hook(props, {...options, local: true}),
  }))
}

export function createStore<T extends Record<string, any>,
  P extends ComponentPropsOptions = ComponentPropsOptions,
  >(options: CreateStoreOptions<T, P>): UseStore<T, Readonly<ExtractPropTypes<P>>>
export function createStore<T extends Record<string, any>,
  >(name: string, setup: Setup<T, EmptyObject>): UseStore<T, EmptyObject>
export function createStore(
  arg1: any, arg2?: any,
) {
  return defineStore(arg1, arg2)
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
