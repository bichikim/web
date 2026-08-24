// @refresh reload
import {mount, StartClient} from '@solidjs/start/client'

import {installClientErrorHandlers} from './features/client-error-reporter'
import {installPreloadErrorRecovery} from './features/deployment-recovery'

const disposeClientErrorHandlers = installClientErrorHandlers()
const preloadRecovery = installPreloadErrorRecovery()

const root = document.querySelector('#root')

if (root === null) {
  throw new Error('Root element not found')
}

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
