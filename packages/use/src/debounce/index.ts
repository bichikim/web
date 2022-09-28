import {debounce} from '@winter-love/lodash'
import {defaultRef} from 'src/default-ref'
import {resolveRef} from 'src/resolve-ref'
import {MaybeRef} from 'src/types'
import {watchEffect} from 'vue'

export type UseDebounceHandle<Args extends any[], R> = (...args: Args) => R

const DEFAULT_WAIT = 150

export const useDebounce = <Args extends any[], R>(
  handle: UseDebounceHandle<Args, R>,
  wait?: MaybeRef<number | undefined>,
  immediate: MaybeRef<boolean> = false,
) => {
  const onHandle = (...args: Args): R => {
    return handle?.(...args)
  }

  const waitRef = defaultRef(resolveRef(wait), () => DEFAULT_WAIT)

  const immediateRef = resolveRef(immediate)

  let call

  const updateCall = (_call) => {
    call = _call
  }

  const disposeCall = () => {
    call?.cancel?.()
  }

  watchEffect((onCleanup) => {
    onCleanup(() => {
      disposeCall()
    })
    const wait = waitRef.value
    const immediate = immediateRef.value
    if (wait > 0) {
      updateCall(
        debounce(onHandle, wait, {
          leading: immediate,
        }),
      )
      return
    }
    updateCall(onHandle)
  })

  return (...args: Args): R => {
    return call?.(...args)
  }
}
