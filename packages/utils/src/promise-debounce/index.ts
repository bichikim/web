import {debounce} from '@winter-love/lodash'

interface DebounceFunc<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): Promise<ReturnType<T>>

  cancel: () => any
  flush: () => ReturnType<T> | undefined
}

export const promiseDebounce = <T extends (...args: any[]) => any>(fn: T, wait?: number): DebounceFunc<T> => {
  let callbacks: any = []

  const handle = (...args: Parameters<T>) => {
    const result = fn(...args)
    callbacks.forEach((callback) => callback(result))
    callbacks = []
    return result
  }

  const debouncedFunction = debounce(handle, wait)

  const func: (...args: Parameters<T>) => Promise<ReturnType<T>> = (...args) => {
    return new Promise((resolve) => {
      debouncedFunction(...args)
      callbacks.push(resolve)
    })
  }

  return Object.assign(func, {
    cancel: debouncedFunction.cancel,
    flush: debouncedFunction.flush,
  })
}
