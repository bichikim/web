import {STORE_LOCAL_CONTEXT} from 'src/store/symbols'
import {StoreManager, StoreManagerItem, useStoreManager} from './manager'
import {
  ComponentPropsOptions,
  ExtractPropTypes,
  getCurrentInstance, inject,
  onScopeDispose,
  reactive, Ref,
  UnwrapNestedRefs, watch,
} from 'vue-demi'

import {propsValidator} from './props-validator'
export type UseStore<T, P> = (props?: ObjectWithRef<P>, options?: UseStoreOptions) => Store<T>
export type ObjectWithRef<T extends Record<string, any>> = {
  [P in keyof T]: Ref<T[P]> | T[P]
}
export type Store<T> = UnwrapNestedRefs<T> & {
  readonly __store?: never
}
// eslint-disable-next-line @typescript-eslint/ban-types
export type EmptyObject = {}
export interface UseStoreOptions {
  /**
   * reset saved store
   */
  reset?: boolean
}
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

const createUUid = () => {
  let count = 0
  return () => {
    count += 1
    return count
  }
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
const getUuid = createUUid()
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
