import {createUseWait} from 'src/wait'
import {debounce, DebouncedFunc} from '@winter-love/lodash'

export const useDebounce = createUseWait(() => {
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
      flag?.(...args)
    },
    flush: () => {
      flag?.flush()
    },
  }
})
