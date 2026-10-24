import {debounce, type DebouncedFunc} from './debounce'

export interface ThrottleSettings {
  leading?: boolean
  trailing?: boolean
}

export type ThrottledFunc<T extends (...args: any[]) => any> = DebouncedFunc<T>

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  throttleMs: number = 0,
  options: ThrottleSettings = {},
): ThrottledFunc<T> => {
  const {leading = true, trailing = true} = options

  return debounce(func, throttleMs, {
    leading,
    maxWait: throttleMs,
    trailing,
  })
}
