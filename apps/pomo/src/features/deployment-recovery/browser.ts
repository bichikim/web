import {type PreloadErrorRecoveryRegistration, registerPreloadErrorRecovery} from './recovery'

const PRELOAD_RECOVERY_SESSION_KEY = 'pomo:preload-recovery:v1'
const PRELOAD_RECOVERY_STABILIZATION_MILLISECONDS = 10_000

/** Installs guarded Vite preload-error recovery for the current browser session. */
export const installPreloadErrorRecovery = (): PreloadErrorRecoveryRegistration =>
  registerPreloadErrorRecovery({
    addPreloadErrorListener: (listener) =>
      globalThis.addEventListener('vite:preloadError', listener),
    clearGuard: () => globalThis.sessionStorage.removeItem(PRELOAD_RECOVERY_SESSION_KEY),
    now: () => Date.now(),
    readGuard: () => globalThis.sessionStorage.getItem(PRELOAD_RECOVERY_SESSION_KEY),
    reload: () => globalThis.location.reload(),
    removePreloadErrorListener: (listener) =>
      globalThis.removeEventListener('vite:preloadError', listener),
    scheduleGuardClear: (clearGuard) => {
      const timeoutId = globalThis.setTimeout(
        clearGuard,
        PRELOAD_RECOVERY_STABILIZATION_MILLISECONDS,
      )
      return () => globalThis.clearTimeout(timeoutId)
    },
    writeGuard: (expiresAt) =>
      globalThis.sessionStorage.setItem(PRELOAD_RECOVERY_SESSION_KEY, String(expiresAt)),
  })
