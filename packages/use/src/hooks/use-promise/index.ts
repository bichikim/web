import {freeze} from '@winter-love/utils'
import {mutRef} from 'src/refs/mut-ref'
import {isInInstance} from 'src/checks/is-in-instance'
import {onMounted, Ref, ref, toRef} from 'vue'

export type RetryPromiseRecipe = () => any[] | boolean

export interface UsePromiseOptions<Data> {
  /**
   * todo
   * 반복 호출 시 케시 사용
   */
  cache?: boolean | ((key: any) => Data)

  /**
   * 이미 진행 중인 Promise 를 취소하고 execute 할지 여부
   */
  cancelPrevPromise?: boolean

  /**
   * Sets the dataRef to undefined before executing
   * @default true
   */
  cleanOnExecute?: boolean

  /**
   * todo
   * 반복 호출 무시
   */
  ignoreTime?: number

  /**
   * execute the promise right after initialization
   */
  immediate?: boolean

  initData?: Data

  retry?: RetryPromiseRecipe
}

export interface UsePromiseReturnType<Data, Args extends any[], Error> {
  cancel: () => void
  count: Ref<number>
  data: Ref<Data | undefined>
  error: Ref<Error | undefined>
  execute: (...args: Args) => Promise<Data>
  promise: Ref<Promise<Data> | undefined>
  waiting: Ref<boolean>
}

export interface RecipeContext<Data, Error> {
  readonly previous: {
    readonly args: any[]
    readonly count: number
    readonly data: Data | undefined
    readonly error: Error | undefined
    readonly retryCount: number
  }
  signal: AbortSignal
}

export type Recipe<Data, Args extends any[], Error> =
  // todo cannot pass Data type
  (context: RecipeContext<any, Error>, ...args: Args) => Promise<Data>

export const getRetryArgs = (
  context: RecipeContext<any, any>,
  retry?: RetryPromiseRecipe,
): undefined | any[] => {
  const _result = retry?.()
  if (Array.isArray(_result)) {
    return _result
  }
  if (_result) {
    return []
  }
}

/**
 * todo experimental
 * @experimental
 * @param recipe
 * @param options
 */
export const usePromise = <Data, Args extends any[] = any, Error = any>(
  recipe: Recipe<Data, Args, Error>,
  options: UsePromiseOptions<Data> = {},
): UsePromiseReturnType<Data, Args, Error> => {
  const {immediate, retry} = options
  const cancelPrevPromise = toRef(options, 'cancelPrevPromise', false)
  const cleanOnExecuteRef = toRef(options, 'cleanOnExecute', true)
  const dataRef = mutRef(toRef(options, 'initData'))
  const argsRef = ref<any[]>([])
  const countRef = ref<number>(0)
  const waitingRef = ref<boolean>(false)
  const errorRef = ref<Error | undefined>()
  const promiseRef = ref<Promise<Data> | undefined>()
  const abortController = new AbortController()
  const retryCountRef = ref(0)

  const getRecipeContext = () => {
    return freeze({
      previous: freeze({
        args: argsRef.value,
        count: countRef.value,
        data: dataRef.value,
        error: errorRef.value,
        retryCount: retryCountRef.value,
      }),
      signal: abortController.signal,
    })
  }

  const execute = (...args: Args) => {
    if (cancelPrevPromise.value) {
      cancel()
    }
    if (cleanOnExecuteRef.value) {
      dataRef.value = undefined
    }

    const context = getRecipeContext()

    waitingRef.value = true
    errorRef.value = undefined
    countRef.value += 1

    const promise = recipe(context, ...args)
      .then((data) => {
        dataRef.value = data
        waitingRef.value = false
        retryCountRef.value = 0
        return data
      })
      .catch((error) => {
        errorRef.value = error
        const context = getRecipeContext()
        const retryArgs = getRetryArgs(context, retry)
        if (retryArgs) {
          retryCountRef.value += 1
          return execute(...(retryArgs as any))
        }
        waitingRef.value = false
        throw error
      })

    argsRef.value = args
    promiseRef.value = promise
    return promise
  }

  const cancel = () => {
    abortController.abort()
  }

  if (immediate) {
    if (isInInstance()) {
      onMounted(() => {
        promiseRef.value = execute(...(argsRef.value as any))
      })
    } else {
      promiseRef.value = execute(...(argsRef.value as any))
    }
  }

  return freeze({
    cancel,
    count: countRef,
    data: dataRef,
    error: errorRef,
    execute,
    promise: promiseRef,
    waiting: waitingRef,
  })
}
