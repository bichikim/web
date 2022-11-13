import {resolveRef} from 'src/resolve-ref'
import {bindRef} from 'src/bind-ref'
import {onMounted, Ref, ref, toRef} from 'vue'
import {createCancelPromise, freeze, toArray} from '@winter-love/utils'
import {MaybeRef} from 'src/types'
import {isInInstance} from 'src/is-in-instance'

export interface UsePromiseOptions<Data> {
  /**
   * todo
   * cancel 전에 호출 AbortController 사용등
   */
  beforeCancel?: () => void

  /**
   * todo
   * 반복 호출 시 케시 사용
   */
  cache?: boolean | ((key: any) => Data)

  /**
   * todo
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
    readonly count: number
    readonly data: Data | undefined
    readonly error: Error | undefined
  }
  signal: AbortSignal
}

export type Recipe<Data, Args extends any[], Error> =
  // todo cannot pass Data type
  (context: RecipeContext<any, Error>, ...args: Args) => Promise<Data>

/**
 * todo experimental
 * @experimental
 * @param recipe
 * @param args
 * @param options
 */
export const usePromise = <Data, Args extends any[] = any, Error = any>(
  recipe: Recipe<Data, Args, Error>,
  args?: MaybeRef<Args>,
  options: UsePromiseOptions<Data> = {},
): UsePromiseReturnType<Data, Args, Error> => {
  const {immediate, initData} = options
  const cleanOnExecuteRef = toRef(options, 'cleanOnExecute', true)
  const dataRef = bindRef(resolveRef<Data | undefined>(initData))
  const argsRef = resolveRef(args)
  const countRef = ref<number>(0)
  const waitingRef = ref<boolean>(false)
  const errorRef = ref<Error | undefined>()
  const promiseRef = ref<Promise<Data> | undefined>()
  const abortController = new AbortController()

  const execute = (...args: Args) => {
    if (cleanOnExecuteRef.value) {
      dataRef.value = undefined
    }

    const context = freeze({
      previous: {
        count: countRef.value,
        data: dataRef.value,
        error: errorRef.value,
      },
      signal: abortController.signal,
    })

    waitingRef.value = true
    errorRef.value = undefined
    countRef.value += 1

    const promise = recipe(context, ...args)
      .then((data) => {
        dataRef.value = data
        waitingRef.value = false
        return data
      })
      .catch((error) => {
        errorRef.value = error
        waitingRef.value = false
        throw error
      })

    promiseRef.value = promise
    return promise
  }

  // https://stackoverflow.com/questions/30233302/promise-is-it-possible-to-force-cancel-a-promise
  const cancel = () => {
    abortController.abort()
  }

  if (immediate) {
    if (isInInstance()) {
      onMounted(() => {
        promiseRef.value = execute(...(toArray(argsRef.value) as any))
      })
    } else {
      promiseRef.value = execute(...(toArray(argsRef.value) as any))
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
