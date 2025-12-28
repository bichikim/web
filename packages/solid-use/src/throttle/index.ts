import {throttle} from 'es-toolkit/compat'
import {createUseWait} from 'src/wait'

type DebouncedFunc<T extends (...args: any) => any> = T & {
  cancel: () => void
  flush: () => ReturnType<T>
}

export const useThrottle = createUseWait(() => {
  let flag: undefined | DebouncedFunc<(...args: any) => any>

  return {
    cancel: () => {
      flag?.cancel()
    },
    create: (callback, wait, options) => {
      flag = throttle(
        (...args) => {
          callback(...args)
        },
        wait,
        options,
      ) as DebouncedFunc<(...args: any) => any>
    },
    execute: (args) => {
      flag?.(...args)
    },
    flush: () => {
      flag?.flush()
    },
  }
})
