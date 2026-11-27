import {mount, StartClient} from '@solidjs/start/client'
import {startInitialCharacterDocument} from './features/character-preview/model'

if (import.meta.env.DEV) {
  import('virtual:uno.css')
}

const root = document.querySelector('#root')
if (root === null) {
  throw new Error('Application root is missing')
}
if (location.pathname === '/') {
  startInitialCharacterDocument()
}
mount(() => <StartClient />, root)
