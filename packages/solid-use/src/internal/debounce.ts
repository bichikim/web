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

/** Delays calls until the trailing edge or maximum waiting deadline, with optional leading execution. */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  debounceMs: number = 0,
  options: DebounceSettings = {},
): DebouncedFunc<T> => {
  const {leading = false, maxWait, trailing = true} = options
  let result: ReturnType<T> | undefined
  let pendingArgs: Parameters<T> | null = null
  let lastCallAt: number | undefined
  let lastInvokeAt = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const invoke = (now: number) => {
    const args = pendingArgs
    pendingArgs = null
    lastInvokeAt = now

    if (args !== null) {
      result = func(...args)
    }
    return result
  }

  const shouldInvoke = (now: number) => {
    if (lastCallAt === undefined) {
      return true
    }
    const elapsed = now - lastCallAt
    return (
      elapsed >= debounceMs ||
      elapsed < 0 ||
      (maxWait !== undefined && now - lastInvokeAt >= maxWait)
    )
  }

  const finishWaiting = (now: number) => {
    timer = undefined
    if (trailing && pendingArgs !== null) {
      return invoke(now)
    }
    pendingArgs = null
    return result
  }

  const onDeadline = () => {
    const now = Date.now()
    if (shouldInvoke(now)) {
      finishWaiting(now)
      return
    }
    const quietRemaining = debounceMs - (now - (lastCallAt ?? now))
    const remaining =
      maxWait === undefined
        ? quietRemaining
        : Math.min(quietRemaining, maxWait - (now - lastInvokeAt))
    timer = setTimeout(onDeadline, remaining)
  }

  const startWaiting = () => {
    timer = setTimeout(onDeadline, Math.min(debounceMs, maxWait ?? Infinity))
  }

  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
    lastCallAt = undefined
    lastInvokeAt = 0
    pendingArgs = null
  }

  const flush = () => {
    if (timer === undefined) {
      return result
    }
    clearTimeout(timer)
    return finishWaiting(Date.now())
  }

  const wrapped = (...args: Parameters<T>): ReturnType<T> | undefined => {
    const now = Date.now()
    const isDue = shouldInvoke(now)
    pendingArgs = args
    lastCallAt = now

    if (isDue) {
      if (timer === undefined) {
        lastInvokeAt = now
        startWaiting()
        return leading ? invoke(now) : result
      }
      if (maxWait !== undefined) {
        clearTimeout(timer)
        startWaiting()
        return leading || trailing ? invoke(now) : result
      }
    }

    if (timer === undefined) {
      startWaiting()
    }
    return result
  }

  return Object.assign(wrapped, {cancel, flush})
}
