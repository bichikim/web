import {debounce as baseDebounce} from 'es-toolkit/function'

export interface DebounceSettings {
  leading?: boolean
  maxWait?: number
  trailing?: boolean
}

export interface DebouncedFunc<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T> | undefined
  cancel(): void
  flush(): ReturnType<T> | undefined
}

// Preserve the published leading/trailing/maxWait contract while using the modern API.
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  debounceMs: number = 0,
  options: DebounceSettings = {},
): DebouncedFunc<T> => {
  const {leading = false, maxWait, trailing = true} = options
  const edges: Array<'leading' | 'trailing'> = []

  if (leading) {
    edges.push('leading')
  }

  if (trailing) {
    edges.push('trailing')
  }

  let result: ReturnType<T> | undefined
  let pendingAt: null | number = null
  const debounced = baseDebounce(
    (...args: Parameters<T>) => {
      result = func(...args)
      pendingAt = null
    },
    debounceMs,
    {edges},
  )

  const wrapped = (...args: Parameters<T>): ReturnType<T> | undefined => {
    if (maxWait !== undefined) {
      pendingAt ??= Date.now()

      if (Date.now() - pendingAt >= maxWait) {
        result = func(...args)
        pendingAt = Date.now()
        debounced.cancel()
        debounced.schedule()

        return result
      }
    }

    debounced(...args)

    return result
  }

  const flush = (): ReturnType<T> | undefined => {
    debounced.flush()

    return result
  }

  return Object.assign(wrapped, {cancel: debounced.cancel, flush})
}
