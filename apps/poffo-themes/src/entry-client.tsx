import {mount, StartClient} from '@solidjs/start/client'

if (import.meta.env.DEV) {
  import('virtual:uno.css')
}

const root = document.querySelector('#root')
if (root === null) {
  throw new Error('Application root is missing')
}
mount(() => <StartClient />, root)
