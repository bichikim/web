import {freeze} from '@winter-love/utils'
import {
  getCurrentInstance,
  inject,
  onScopeDispose,
  reactive,
  toRaw,
  UnwrapNestedRefs,
} from 'vue-demi'
import {createUuid} from './create-uuid'
import {StoreManager, StoreManagerItem, useStoreManager} from './manager'
import {STORE_LOCAL_CONTEXT} from './symbols'

const getUuid = createUuid()
// eslint-disable-next-line @typescript-eslint/ban-types
export type EmptyObject = {}

export type UseStore<T extends Record<string, any>> = ((
  options?: UseStoreOptions,
) => UnwrapNestedRefs<T>) & {
  readonly local: (options?: Omit<UseStoreOptions, 'local'>) => UnwrapNestedRefs<T>
}

export interface UseStoreOptions {
  /**
   * use as a normal composition api function
   */
  local?: boolean

  /**
   * target manager
   */
  manager?: StoreManager

  /**
   * reset saved store
   */
  reset?: boolean
}

export type Setup<
  T extends Record<string, any>,
  Root extends Record<string, any> = Record<string, any>,
> = (initState: Partial<T>, root: UnwrapNestedRefs<Root>) => T

export interface CreateStoreOptions<T extends Record<string, any>> {
  /**
   * @experimental use at using time
   */
  local?: boolean
  name: string
  setup: Setup<T>
}

export interface CreateSetupArgs<T extends Record<string, any>> {
  initState: Partial<T>
  setup: Setup<T>
  storeManager: StoreManager
}

const createSetup = <T extends Record<string, any>>(
  args: CreateSetupArgs<T>,
): StoreManagerItem<T> => {
  const {setup, storeManager, initState} = args
  return {
    state: reactive(
      setup(
        // initState
        initState,
        // root
        storeManager.state.value,
      ),
    ),
  }
}

export interface CreateLocalStoreArgs<T extends Record<string, any>>
  extends Omit<CreateSetupArgs<T>, 'initState'> {
  name: string
}

const createLocalStore = <T extends Record<string, any>>(
  args: CreateLocalStoreArgs<T>,
): UnwrapNestedRefs<T> => {
  const {name, storeManager, setup} = args
  const item: StoreManagerItem<T> = createSetup<T>({
    initState: {},
    setup,
    storeManager,
  })
  const instance = getCurrentInstance()
  const uid = instance ? instance.uid : getUuid()
  const componentName = (instance as any)?.ctx?.$options?.name ?? 'Undefined Name'
  const uuidName =
    process.env.NODE_ENV === 'production'
      ? `${uid}`
      : JSON.stringify({
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

  return item.state
}

export interface CreateGlobalStoreArgs<T extends Record<string, any>>
  extends Omit<UseStoreOptions, 'local' | 'manager'> {
  name: string

  setup: Setup<T>
  storeManager: StoreManager
}

const createGlobalStore = <T extends Record<string, any>>(
  args: CreateGlobalStoreArgs<T>,
): UnwrapNestedRefs<T> => {
  const {name, reset, storeManager, setup} = args
  const savedState: StoreManagerItem<T> | undefined = storeManager.get(name)

  if (savedState && !reset) {
    return savedState.state
  }
  const initState = toRaw(storeManager.initState[name] ?? {})
  const newState = createSetup({
    initState,
    setup,
    storeManager,
  })
  storeManager.set(name, newState)
  return newState.state
}

export const useLocalManager = (): StoreManager | undefined => {
  return inject(STORE_LOCAL_CONTEXT)
}
const getOptions = <T extends Record<string, any>>(
  arg1: string | CreateStoreOptions<T>,
  arg2?: Setup<T>,
): CreateStoreOptions<T> => {
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

export function defineStore<T extends Record<string, any>>(
  options: CreateStoreOptions<T>,
): UseStore<T>
export function defineStore<T extends Record<string, any>>(
  name: string,
  setup: Setup<T, EmptyObject>,
): UseStore<T>
export function defineStore<T extends Record<string, any>>(
  arg1: string | CreateStoreOptions<T>,
  arg2?: Setup<T>,
) {
  const {name, setup, local} = getOptions<T>(arg1, arg2)

  // eslint-disable-next-line max-statements
  const hook = (options: UseStoreOptions = {}): T => {
    const {local: innerLocal = local, reset, manager} = options

    const storeManager = manager ?? useStoreManager()

    console.log(storeManager.state.value)

    if (innerLocal) {
      return createLocalStore<T>({name, setup, storeManager})
    }
    return createGlobalStore({
      name,
      reset,
      setup,
      storeManager,
    })
  }
  return freeze(
    Object.assign(hook, {
      local: (options: Omit<UseStoreOptions, 'local'> = {}) => hook({...options, local: true}),
    }),
  )
}

export function createStore<T extends Record<string, any>>(
  options: CreateStoreOptions<T>,
): UseStore<T>
export function createStore<T extends Record<string, any>>(
  name: string,
  setup: Setup<T, EmptyObject>,
): UseStore<T>
export function createStore(arg1: any, arg2?: any) {
  return defineStore(arg1, arg2)
}

/**
 * @deprecated
 * @param options
 */
export function useStore<T extends Record<string, any>>(options: CreateStoreOptions<T>)
export function useStore<T extends Record<string, any>>(name: string, setup: Setup<T>)
export function useStore(arg1: any, arg2?: any) {
  return createStore(arg1, arg2)()
}
