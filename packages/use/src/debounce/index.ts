import {debounce} from '@winter-love/lodash'
import {computed, onScopeDispose} from 'vue-demi'
import {wrapRef} from 'src/wrap-ref'
import {MayRef} from 'src/types'
import {unwrapRef} from 'src/unwrap-ref'

export type UseDebounceHandle<Args extends any[], R> = (...args: Args) => R

const DEFAULT_WAIT = 150

interface DebounceFunction<Args extends any[], R> {
  (...args: Args) : R
  cancel?: () => any
  flush?: () => any
}

export const useDebounce = <Args extends any[], R>(
  handle: UseDebounceHandle<Args, R>,
  wait?: MayRef<number | undefined>,
  immediate: MayRef<boolean> = false,
) => {
  const onHandle = (...args: Args): R => {
    return handle?.(...args)
  }

  const waitRef = computed<number>(() => {
    return unwrapRef(wait) ?? DEFAULT_WAIT
  })
  const immediateRef = wrapRef(immediate)

  const onCall = computed((): DebounceFunction<Args, R> => {
    const wait = waitRef.value
    if (wait > 0) {
      return debounce(onHandle, wait, {
        trailing: immediateRef.value,
      }) as any
    }
    return onHandle
  })

  onScopeDispose(() => {
    onCall.value?.cancel?.()
  })

  return (...args: Args): R => {
    return onCall.value(...args)
  }
}
