import {debounce} from 'debounce'
import {computed, onScopeDispose} from 'vue-demi'
import {wrapRef} from 'src/wrap-ref'
import {MayRef} from 'src/types'

export type UseDebounceHandle<Args extends any[]> = (...args: Args) => unknown

const DEFAULT_WAIT = 150

interface DebounceFunction<Args extends any[]> {
  (...args: Args) : unknown
  clear?: () => unknown
  flush?: () => unknown
}

export const useDebounce = <Args extends any[]>(
  handle?: UseDebounceHandle<Args>,
  wait?: MayRef<number | undefined>,
  immediate: MayRef<boolean> = false,
) => {
  const onHandle = (...args: Args) => {
    return handle?.(...args)
  }

  const waitRef = wrapRef(wait, {defaultValue: DEFAULT_WAIT})
  const immediateRef = wrapRef(immediate)

  const onCall = computed((): DebounceFunction<Args> => {
    const wait = waitRef.value
    if (wait) {
      return debounce(onHandle, wait, immediateRef.value)
    }
    return onHandle
  })

  onScopeDispose(() => {
    onCall.value?.clear?.()
  })

  return (...args: Args) => {
    onCall.value(...args)
  }
}
