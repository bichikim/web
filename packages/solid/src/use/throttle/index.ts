import {DebouncedFunc, throttle} from '@winter-love/lodash'
import {createUseWait} from 'src/use/wait'

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
      )
    },
    execute: (args) => {
      flag?.(...args)
    },
    flush: () => {
      flag?.flush()
    },
  }
})
