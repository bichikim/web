import {debounce} from '@winter-love/lodash'
import {MayRef} from 'src/types'
import {unwrapRef} from 'src/unwrap-ref'
import {wrapRef} from 'src/wrap-ref'
import {computed, onScopeDispose, watchEffect} from 'vue-demi'

export type UseDebounceHandle<Args extends any[], R> = (...args: Args) => R

const DEFAULT_WAIT = 150

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
  let call: any = onHandle

  watchEffect(() => {
    const wait = waitRef.value
    const immediate = immediateRef.value
    call?.cancel?.()
    if (wait > 0) {
      call = debounce(onHandle, wait, {
        leading: immediate,
      })
      return
    }
    call = onHandle
  })

  onScopeDispose(() => {
    call?.cancel?.()
  })

  return (...args: Args): R => {
    return call(...args)
  }
}
