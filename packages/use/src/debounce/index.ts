import {debounce} from 'debounce'
import {computed, onScopeDispose} from 'vue-demi'
import {wrapRef} from 'src/wrap-ref'
import {MayRef} from 'src/types'

export type UseDebounceHandle<Args extends any[], R> = (...args: Args) => R

const DEFAULT_WAIT = 150

interface DebounceFunction<Args extends any[], R> {
  (...args: Args) : R
  clear?: () => unknown
  flush?: () => unknown
}

export const useDebounce = <Args extends any[], R>(
  handle: UseDebounceHandle<Args, R>,
  wait?: MayRef<number | undefined>,
  immediate: MayRef<boolean> = false,
) => {
  const onHandle = (...args: Args): R => {
    return handle?.(...args)
  }

  const waitRef = wrapRef(wait, {defaultValue: DEFAULT_WAIT})
  const immediateRef = wrapRef(immediate)

  const onCall = computed((): DebounceFunction<Args, R> => {
    const wait = waitRef.value
    if (wait) {
      return debounce(onHandle, wait, immediateRef.value)
    }
    return onHandle
  })

  onScopeDispose(() => {
    onCall.value?.clear?.()
  })

  return (...args: Args): R => {
    return onCall.value(...args)
  }
}
