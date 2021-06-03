import {ref, Ref} from 'vue-demi'

export type Recipe<Args extends any[], Data> = (...args: Args) => Promise<Data>

export interface UsePromiseOptions<Args extends any[]> {
  immediate?: boolean | Args
}

export interface UsePromiseReturnType<Data, Args extends any[], Error> {
  count: Ref<number>
  data: Ref<Data | undefined>
  error: Ref<Error | undefined>
  execute: (...args: Args) => Promise<Data>
  fetching: Ref<boolean>
  promise: Ref<Promise<Data>| undefined>
}

export const usePromise = <Data, Args extends any[], Error = any>(
  recipe: Recipe<Args, Data>,
  options: UsePromiseOptions<Args> = {},
): UsePromiseReturnType<Data, Args, Error> => {
  const {immediate} = options
  const dataRef = ref<Data | undefined>()
  const countRef = ref<number>(0)
  const fetchingRef = ref<boolean>(false)
  const errorRef = ref<Error | undefined>()
  const promiseRef = ref<Promise<Data> | undefined>()

  const execute = (...args: Args) => {
    fetchingRef.value = true
    dataRef.value = undefined
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
        throw error
      })

    promiseRef.value = promise
    return promise
  }

  if (immediate) {
    let args: any[]
    if (typeof immediate === 'boolean') {
      args = []
    } else {
      args = [...immediate]
    }

    promiseRef.value = execute(...args as any)
  }

  return {
    execute,
    data: dataRef,
    count: countRef,
    fetching: fetchingRef,
    error: errorRef,
    promise: promiseRef,
  }
}
