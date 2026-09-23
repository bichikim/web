const MILLISECONDS_PER_SECOND = 1000

export interface InactivityOptions {
  readonly enabled: () => boolean
  readonly seconds: () => number
  readonly isSuspended: () => boolean
  readonly isBlocked: () => boolean
  readonly schedule: (expire: () => void, milliseconds: number) => () => void
  readonly onHiddenChange: (hidden: boolean) => void
}

/** Owns one inactivity deadline; wake resets it and dispose cancels it. */
export const createInactivityController = (options: InactivityOptions) => {
  let cancel: (() => void) | null = null
  const dispose = () => {
    cancel?.()
    cancel = null
  }
  const wake = () => {
    dispose()
    options.onHiddenChange(false)
    if (!options.enabled() || options.isSuspended()) {
      return
    }
    cancel = options.schedule(() => {
      if (options.isBlocked()) {
        wake()
      } else {
        options.onHiddenChange(true)
      }
    }, options.seconds() * MILLISECONDS_PER_SECOND)
  }
  return {dispose, wake}
}
