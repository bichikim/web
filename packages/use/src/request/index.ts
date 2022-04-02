import {UnwrapNestedRefs} from '@vue/reactivity'
import {useElementEvent} from 'src/element-event'
import {clone, EmptyObject, isSSR} from '@winter-love/utils'
import {computed, isRef, readonly, ref, Ref, unref, UnwrapRef} from 'vue'

export type RequestResult<R, P> = {
  cancel: () => void
  data: Ref<UnwrapRef<R> | undefined>
  error: Ref<Error | undefined>
  loading: Ref<boolean>
  retry: () => Promise<UnwrapRef<R> | null>
  // params: Ref<P>
  run: (payload: P) => Promise<UnwrapRef<R> | null>
}

export type Service<P = EmptyObject, R = any> = ((payload: P, signal: AbortSignal) => Promise<UnwrapRef<R>>)

export type BaseOptions<R, P> = {
  /**
   * default 150
   */
  debounce?: number
  // cacheKey?: string
  initialData?: R
  // onAfter?: (params: P) => void
// onBefore?: (params: P) => void
  onError?: (error: Error, payload: P) => void
  onSuccess?: (data: UnwrapRef<R>, payload: P) => void
  refreshOnVisibility?: boolean
  refreshOnWindowFocus?: boolean
  startInCreated?: boolean
  // queryKey?: (...args: P) => string
  // ready?: Ref<boolean>
  // refreshDeps?: WatchSource<any>[]
};

const unObjectRef = <P extends Record<string, any>>(
  value: Ref<P> | UnwrapNestedRefs<P> | P | undefined,
): P | undefined => {
  if (isRef(value)) {
    return value.value
  }
  if (value) {
    return {...value}
  }
}

export const useRequest = <R, P>(
  service: Service<P, R>,
  options?: BaseOptions<R, P>,
  // eslint-disable-next-line max-statements
) => (
    _payload?: Ref<P> | UnwrapNestedRefs<P> | P,
    innerOptions?: BaseOptions<R, P>,
  ): RequestResult<R, P> => {
    const newOptions = {...options, ...innerOptions}
    const {
      initialData, onSuccess,
      onError, startInCreated,
    } = newOptions
    const refreshOnWindowFocusRef = computed(() => {
      return unref(innerOptions?.refreshOnWindowFocus) ??
      unref(options?.refreshOnWindowFocus) ?? false
    })
    const refreshOnVisibilityRef = computed(() => {
      return unref(innerOptions?.refreshOnVisibility) ??
      unref(options?.refreshOnVisibility) ?? false
    })
    const loading = ref(false)
    const data: Ref<UnwrapRef<R> | undefined> = ref(initialData)
    const error = ref()
    const abortController = new AbortController()
    const {signal} = abortController
    const previousPayload = ref<P | undefined>()
    const waitPromise = ref<Promise<any>>()

    const run = (payload: P | undefined = unObjectRef<P>(_payload)) => {
      if (!payload) {
        return Promise.reject(new Error('No Payload'))
      }
      previousPayload.value = payload
      loading.value = true
      return service(payload, signal).then((response) => {
        data.value = clone(response)
        onSuccess?.(response, payload)
        loading.value = false
        return response
      }).catch((error_: Error) => {
        error.value = error_
        onError?.(error_, payload)
        loading.value = false
        return null
      })
    }

    const retry = () => {
      return run(previousPayload.value)
    }

    if (!isSSR()) {
      useElementEvent(window, 'focus', () => {
        if (refreshOnWindowFocusRef.value) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
          retry()
        }
      })
      useElementEvent(document, 'visibilitychange', () => {
        if (refreshOnVisibilityRef.value) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
          retry()
        }
      })
    }

    const cancel = () => {
      abortController.abort()
    }

    if (startInCreated) {
      waitPromise.value = run()
    }

    return {
      cancel,
      data,
      error: readonly(error),
      loading: readonly(loading),
      retry,
      run,
    }
  }
