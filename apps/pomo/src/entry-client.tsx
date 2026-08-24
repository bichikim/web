// @refresh reload
import {mount, StartClient} from '@solidjs/start/client'

import {installClientErrorHandlers} from './features/client-error-reporter'

const disposeClientErrorHandlers = installClientErrorHandlers()
import.meta.hot?.dispose(disposeClientErrorHandlers)

const root = document.querySelector('#root')

if (root === null) {
  throw new Error('Root element not found')
}

mount(() => <StartClient />, root)
