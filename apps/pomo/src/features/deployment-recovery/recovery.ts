export interface PreloadErrorRecoveryRuntime {
  readonly addPreloadErrorListener: (listener: (event: Event) => void) => void
  readonly clearGuard: () => void
  readonly now: () => number
  readonly readGuard: () => string | null
  readonly reload: () => void
  readonly removePreloadErrorListener: (listener: (event: Event) => void) => void
  readonly scheduleGuardClear: (clearGuard: () => void) => () => void
  readonly writeGuard: (expiresAt: number) => void
}

export interface PreloadErrorRecoveryRegistration {
  readonly dispose: () => void
  readonly markAppStarted: () => void
}

const GUARD_FALLBACK_EXPIRATION_MS = 60_000

/** Registers one guarded reload path for Vite dynamic-import preload failures. */
export const registerPreloadErrorRecovery = (
  runtime: PreloadErrorRecoveryRuntime,
): PreloadErrorRecoveryRegistration => {
  let cancelGuardClear: (() => void) | null = null
  let disposed = false
  let guardClearCancelled = false
  let reloadStarted = false

  const cancelGuardCleanup = () => {
    if (cancelGuardClear === null || guardClearCancelled) {
      return
    }

    guardClearCancelled = true
    cancelGuardClear()
  }

  const clearGuard = () => {
    try {
      runtime.clearGuard()
    } catch {
      // Browser storage may be disabled without preventing application startup.
    }
  }

  const handlePreloadError = (event: Event) => {
    if (reloadStarted) {
      return
    }

    const currentTime = runtime.now()
    let isGuarded: boolean
    try {
      const guardValue = runtime.readGuard()
      const guardExpiresAt = Number(guardValue)
      isGuarded =
        guardValue !== null && Number.isSafeInteger(guardExpiresAt) && guardExpiresAt > currentTime
    } catch {
      return
    }

    if (isGuarded) {
      return
    }

    try {
      runtime.writeGuard(currentTime + GUARD_FALLBACK_EXPIRATION_MS)
    } catch {
      return
    }

    reloadStarted = true
    cancelGuardCleanup()
    // Reload replaces the rejected import, so suppress the throw only on this recovery path.
    event.preventDefault()
    runtime.reload()
  }

  runtime.addPreloadErrorListener(handlePreloadError)

  return {
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      runtime.removePreloadErrorListener(handlePreloadError)
      cancelGuardCleanup()
    },
    markAppStarted: () => {
      if (disposed || reloadStarted || cancelGuardClear !== null) {
        return
      }

      cancelGuardClear = runtime.scheduleGuardClear(clearGuard)
    },
  }
}
