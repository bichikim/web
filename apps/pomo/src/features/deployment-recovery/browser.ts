import {type PreloadErrorRecoveryRegistration, registerPreloadErrorRecovery} from './recovery'

const PRELOAD_RECOVERY_SESSION_KEY = 'pomo:preload-recovery:v1'
const PRELOAD_RECOVERY_STABILIZATION_MILLISECONDS = 10_000

/** Installs guarded Vite preload-error recovery for the current browser session. */
export const installPreloadErrorRecovery = (): PreloadErrorRecoveryRegistration =>
  registerPreloadErrorRecovery({
    addPreloadErrorListener: (listener) => window.addEventListener('vite:preloadError', listener),
    clearGuard: () => window.sessionStorage.removeItem(PRELOAD_RECOVERY_SESSION_KEY),
    now: () => Date.now(),
    readGuard: () => window.sessionStorage.getItem(PRELOAD_RECOVERY_SESSION_KEY),
    reload: () => window.location.reload(),
    removePreloadErrorListener: (listener) =>
      window.removeEventListener('vite:preloadError', listener),
    scheduleGuardClear: (clearGuard) => {
      const timeoutId = window.setTimeout(clearGuard, PRELOAD_RECOVERY_STABILIZATION_MILLISECONDS)
      return () => window.clearTimeout(timeoutId)
    },
    writeGuard: (expiresAt) =>
      window.sessionStorage.setItem(PRELOAD_RECOVERY_SESSION_KEY, String(expiresAt)),
  })
