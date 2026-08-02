import {MaybeAccessor} from 'src/types'
import {resolveAccessor} from 'src/resolve-accessor'
import {throttle, type ThrottledFunc, type ThrottleSettings} from 'src/internal/throttle'
import {createEffect, onCleanup} from 'solid-js'

export type {ThrottledFunc, ThrottleSettings}

export const createThrottle = <T extends (...args: any) => any>(
  callback: T,
  throttleMs: MaybeAccessor<number>,
  options: MaybeAccessor<ThrottleSettings> = {},
) => {
  const throttleMsAccessor = resolveAccessor(throttleMs)
  const optionsAccessor = resolveAccessor(options)
  let throttleInstance: ThrottledFunc<T> | null = null
  let shouldExecute: Parameters<T> | null = null

  createEffect(() => {
    const ms = throttleMsAccessor()
    const options = optionsAccessor()
    throttleInstance = throttle(callback, ms, options)

    if (shouldExecute) {
      throttleInstance(...shouldExecute)
      shouldExecute = null
    }

    onCleanup(() => {
      throttleInstance?.cancel()
      throttleInstance = null
    })
  })

  onCleanup(() => {
    shouldExecute = null
  })

  return {
    cancel: () => {
      shouldExecute = null
      throttleInstance?.cancel()
    },
    execute: (...args: Parameters<T>) => {
      // 최초 createEffect 전에 여러번 execute 될 경우 마지막 execute 만 실행됩니다
      if (!throttleInstance) {
        shouldExecute = args
        return
      }
      throttleInstance(...args)
    },
    flush: () => {
      throttleInstance?.flush()
    },
  }
}

export const useThrottle = createThrottle
