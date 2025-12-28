import {createUseWait} from 'src/wait'
import {debounce} from 'es-toolkit/compat'

type DebouncedFunc<T extends (...args: any) => any> = T & {
  cancel: () => void
  flush: () => ReturnType<T>
}

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
