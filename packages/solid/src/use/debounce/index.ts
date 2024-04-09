import {waitFactory} from 'src/use/wait'
import {debounce, DebouncedFunc} from '@winter-love/lodash'

export const useDebounce = waitFactory(() => {
  let flag: undefined | DebouncedFunc<(...args: any) => any>
  return {
    cancel: () => {
      flag?.cancel()
    },
    create: (callback, wait, options) => {
      flag = debounce(
        (...args) => {
          callback(...args)
        },
        wait,
        options,
      )
    },
    execute: (args) => {
      if (flag) {
        flag(...args)
      }
    },
    flush: () => {
      flag?.flush()
    },
  }
})
