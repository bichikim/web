import {wrapRef} from 'src/wrap-ref'
import {ref, Ref} from 'vue-demi'
import {freeze} from '@winter-love/utils'
import {MayRef} from 'src/types'

export type Recipe<Args extends any[], Data> = (...args: Args) => Promise<Data>

export interface UsePromiseOptions<Args extends any[]> {
  /**
   * Sets the dataRef to undefined before executing
   * @default true
   */
  cleanOnExecute?: boolean
  /**
   * execute the promise right after initialization
   */
  immediate?: Args
}

export interface UsePromiseReturnType<Data, Args extends any[], Error> {
  count: Ref<number>
  data: Ref<Data | undefined>
  error: Ref<Error | undefined>
  execute: (...args: Args) => Promise<Data>
  fetching: Ref<boolean>
  promise: Ref<Promise<Data> | undefined>
}

/**
 * promise x ref
 * @deprecated please use usePromise2
 * @param recipe
 * @param options
 */
export const usePromise = <Data, Args extends any[], Error = any>(
  recipe: Recipe<Args, Data>,
  options: UsePromiseOptions<Args> = {},
): UsePromiseReturnType<Data, Args, Error> => {
  const {immediate, cleanOnExecute = true} = options
  const dataRef = ref<Data | undefined>()
  const countRef = ref<number>(0)
  const fetchingRef = ref<boolean>(false)
  const errorRef = ref<Error | undefined>()
  const promiseRef = ref<Promise<Data> | undefined>()

  const execute = (...args: Args) => {
    if (cleanOnExecute) {
      dataRef.value = undefined
    }
    fetchingRef.value = true
    errorRef.value = undefined
    countRef.value += 1

    const promise = recipe(...args)
      .then((data) => {
        dataRef.value = data
        fetchingRef.value = false
        return data
      })
      .catch((error) => {
        errorRef.value = error
        fetchingRef.value = false
        // eslint-disable-next-line functional/no-throw-statement
        throw error
      })

    promiseRef.value = promise
    return promise
  }

  if (Array.isArray(immediate)) {
    promiseRef.value = execute(...immediate)
  }

  return freeze({
    count: countRef,
    data: dataRef,
    error: errorRef,
    execute,
    fetching: fetchingRef,
    promise: promiseRef,
  })
}

export interface RecipeContext<Data, Error> {
  readonly previousCount: number
  readonly previousData: Data | undefined
  readonly previousError: Error | undefined
  readonly previousFetching: boolean
  readonly previousPromise: Promise<Data> | undefined
}

export type Recipe2<Data, Args extends any[], Error> =
  // todo cannot pass Data type
  (context: RecipeContext<any, Error>, ...args: Args) => Promise<Data>

export const usePromise2 = <Data, Args extends any[] = [], Error = any>(
  recipe: Recipe2<Data, Args, Error>,
  initData?: MayRef<Data | undefined>,
  options: UsePromiseOptions<Args> = {},
): UsePromiseReturnType<Data, Args, Error> => {
  const {immediate, cleanOnExecute = true} = options
  const dataRef = wrapRef<Data | undefined>(initData)
  const countRef = ref<number>(0)
  const fetchingRef = ref<boolean>(false)
  const errorRef = ref<Error | undefined>()
  const promiseRef = ref<Promise<Data> | undefined>()

  const execute = (...args: Args) => {
    if (cleanOnExecute) {
      dataRef.value = undefined
    }

    const context = freeze({
      previousCount: countRef.value,
      previousData: dataRef.value,
      previousError: errorRef.value,
      previousFetching: fetchingRef.value,
      previousPromise: promiseRef.value,
    })

    fetchingRef.value = true
    errorRef.value = undefined
    countRef.value += 1

    const promise = recipe(context, ...args)
      .then((data) => {
        dataRef.value = data
        fetchingRef.value = false
        return data
      })
      .catch((error) => {
        errorRef.value = error
        fetchingRef.value = false
        // eslint-disable-next-line functional/no-throw-statement
        throw error
      })

    promiseRef.value = promise
    return promise
  }

  if (Array.isArray(immediate)) {
    promiseRef.value = execute(...immediate)
  }

  return freeze({
    count: countRef,
    data: dataRef,
    error: errorRef,
    execute,
    fetching: fetchingRef,
    promise: promiseRef,
  })
}
