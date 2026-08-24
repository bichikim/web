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

const getInitialRedirect = async () => {
  if (!import.meta.env.POMO_IS_APPS_IN_TOSS) {
    return undefined
  }

  const {getLocaleRedirect} = await import('./features/apps-in-toss-locale/bootstrap')
  return getLocaleRedirect(new URL(window.location.href))
}

const startApp = async () => {
  try {
    const redirectUrl = await getInitialRedirect()

    if (redirectUrl !== undefined) {
      preloadRecovery.dispose()
      window.location.replace(redirectUrl)
      return
    }

    mount(() => <StartClient />, root)
    preloadRecovery.markAppStarted()
  } catch (error) {
    preloadRecovery.dispose()
    queueMicrotask(() => {
      throw error
    })
  }
}

startApp()
