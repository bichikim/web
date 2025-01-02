import {createUseWait} from 'src/wait'

export const useTimeout = createUseWait(() => {
  let flag: any
  let _callback: any

  return {
    cancel: () => {
      clearTimeout(flag)
    },
    execute: (args, callback, wait) => {
      flag = setTimeout(callback, wait, ...args)
      _callback = callback
    },
    flush: () => {
      clearTimeout(flag)
      _callback()
    },
  }
})
