// @refresh reload
import {mount, StartClient} from '@solidjs/start/client'

import {installClientErrorHandlers} from './features/client-error-reporter'
import {registerPreloadErrorRecovery} from './features/deployment-recovery'

const disposeClientErrorHandlers = installClientErrorHandlers()

const PRELOAD_RECOVERY_SESSION_KEY = 'pomo:preload-recovery:v1'
const PRELOAD_RECOVERY_STABILIZATION_MS = 10_000

const root = document.querySelector('#root')

if (root === null) {
  throw new Error('Root element not found')
}

const preloadRecovery = registerPreloadErrorRecovery({
  addPreloadErrorListener: (listener) => window.addEventListener('vite:preloadError', listener),
  clearGuard: () => window.sessionStorage.removeItem(PRELOAD_RECOVERY_SESSION_KEY),
  now: () => Date.now(),
  readGuard: () => window.sessionStorage.getItem(PRELOAD_RECOVERY_SESSION_KEY),
  reload: () => window.location.reload(),
  removePreloadErrorListener: (listener) =>
    window.removeEventListener('vite:preloadError', listener),
  scheduleGuardClear: (clearGuard) => {
    const timeoutId = window.setTimeout(clearGuard, PRELOAD_RECOVERY_STABILIZATION_MS)
    return () => window.clearTimeout(timeoutId)
  },
  writeGuard: (expiresAt) =>
    window.sessionStorage.setItem(PRELOAD_RECOVERY_SESSION_KEY, String(expiresAt)),
})
import.meta.hot?.dispose(() => {
  disposeClientErrorHandlers()
  preloadRecovery.dispose()
})

try {
  mount(() => <StartClient />, root)
  preloadRecovery.markAppStarted()
} catch (error) {
  preloadRecovery.dispose()
  throw error
}
