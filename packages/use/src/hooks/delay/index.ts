import {DebouncedFunc, throttle} from '@winter-love/lodash'
import {defaultRef} from 'src/refs/default-ref'
import {resolveRef} from 'src/refs/resolve-ref'
import {MaybeRef} from 'src/types'
import {watchEffect} from 'vue'

const DEFAULT_WAIT = 150

export type UseDelayHandle<Args extends any[] = any, R = any> = (...args: Args) => R

export const createUseDelay = (
  method: (
    handle: UseDelayHandle<any, any>,
    wait: number,
    immediate: boolean,
  ) => DebouncedFunc<UseDelayHandle>,
) => {
  return <Args extends any[], R>(
    handle: UseDelayHandle<Args, R>,
    wait?: MaybeRef<number | undefined>,
    immediate: MaybeRef<boolean> = false,
  ) => {
    return useDelay(method, handle, wait, immediate)
  }
}

export const useDelay = <Args extends any[], R>(
  method: (
    handle: UseDelayHandle<Args, R>,
    wait: number,
    immediate: boolean,
  ) => DebouncedFunc<UseDelayHandle<Args, R>>,
  handle: UseDelayHandle<Args, R>,
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

  const cancel = () => {
    call?.cancel?.()
  }

  watchEffect((onCleanup) => {
    onCleanup(() => {
      cancel()
    })
    const wait = waitRef.value
    const immediate = immediateRef.value
    if (wait > 0) {
      updateCall(
        throttle(onHandle, wait, {
          leading: immediate,
        }),
      )
      return
    }
    updateCall(onHandle)
  })

  return Object.assign(
    (...args: Args): R => {
      return call?.(...args)
    },
    {
      cancel,
      flush: () => {
        return call?.flush?.()
      },
    },
  )
}
