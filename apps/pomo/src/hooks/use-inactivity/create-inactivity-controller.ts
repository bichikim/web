export interface CreateInactivityControllerOptions {
  readonly enabled: () => boolean
  readonly timeoutMs: () => number
  readonly isSuspended: () => boolean
  readonly isBlocked: () => boolean
  readonly schedule: (expire: () => void, milliseconds: number) => () => void
  readonly onInactiveChange: (inactive: boolean) => void
}

export interface InactivityController {
  readonly dispose: () => void
  readonly reset: () => void
  /** Restores active state without changing the deadline. */
  readonly wake: () => void
}

/** Owns one inactivity deadline; reset restarts it and disposal ends the lifecycle. */
export const createInactivityController = (
  options: CreateInactivityControllerOptions,
): InactivityController => {
  let cancel: (() => void) | null = null
  let disposed = false
  const clearDeadline = () => {
    cancel?.()
    cancel = null
  }
  const wake = () => {
    if (!disposed) {
      options.onInactiveChange(false)
    }
  }
  const reset = () => {
    if (disposed) {
      return
    }
    clearDeadline()
    wake()
    if (!options.enabled() || options.isSuspended()) {
      return
    }
    cancel = options.schedule(() => {
      if (options.isBlocked()) {
        reset()
      } else {
        options.onInactiveChange(true)
      }
    }, options.timeoutMs())
  }
  const dispose = () => {
    disposed = true
    clearDeadline()
  }
  return {dispose, reset, wake}
}
