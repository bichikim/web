import {MaybeAccessor} from 'src/types'
import {resolveAccessor} from 'src/resolve-accessor'
import {throttle, type ThrottledFunc, type ThrottleSettings} from 'src/internal/throttle'
import {createScheduledCallback} from 'src/internal/create-scheduled-callback'

export type {ThrottledFunc, ThrottleSettings}

export const createThrottle = <T extends (...args: any) => any>(
  callback: T,
  throttleMs: MaybeAccessor<number>,
  options: MaybeAccessor<ThrottleSettings> = {},
) => {
  const throttleMsAccessor = resolveAccessor(throttleMs)
  const optionsAccessor = resolveAccessor(options)
  return createScheduledCallback<Parameters<T>>(() =>
    throttle(callback, throttleMsAccessor(), optionsAccessor()),
  )
}

export const useThrottle = createThrottle
