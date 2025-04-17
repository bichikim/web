// @refresh reload
import {mount, StartClient} from '@solidjs/start/client'

const root = document.querySelector('#root')

if (!root) {
  throw new Error('Root element not found')
}

mount(() => <StartClient />, root)
